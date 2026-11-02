import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { createNotification } from '../services/notification.service';
import { startOfDayIn } from '../utils/time';
import { canAccessGym, requestedGymId } from '../utils/tenant';

// Public: list active trainers at a specific approved gym so a member can pick one.
// The gymId is required — an anonymous caller must never see trainers from every
// tenant at once.
export const listTrainers = async (req: AuthRequest, res: Response) => {
  try {
    const { gymId } = req.query as { gymId?: string };
    if (!gymId) return res.status(400).json({ error: 'gymId query parameter is required' });

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { status: true } });
    if (!gym || gym.status !== 'APPROVED') return res.status(404).json({ error: 'Gym not found' });

    const trainers = await prisma.trainerDetails.findMany({
      where: { gymId, status: 'ACTIVE', gym: { status: 'APPROVED' } },
      include: {
        user: { select: { id: true, username: true } },
        gym: { select: { id: true, name: true, city: true } },
      },
      orderBy: { joiningDate: 'desc' },
    });
    res.json(trainers);
  } catch {
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
};

// Sessions run on the hour, 6am to 8pm.
// shortcut: no per-trainer availability model yet, upgrade when trainers set their own hours.
const SLOT_TIMES = Array.from({ length: 15 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);

// Start of a gym-local date + HH:mm as a real instant.
const slotInstant = (date: string, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(startOfDayIn(new Date(`${date}T12:00:00Z`)).getTime() + (hours! * 60 + minutes!) * 60_000);
};

// Member: which hourly slots a trainer at their gym still has free on a date
export const getAvailableSlots = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { trainerId, date } = req.query as { trainerId: string; date: string };

    const trainer = await prisma.trainerDetails.findFirst({ where: { userId: trainerId, status: 'ACTIVE' }, select: { gymId: true } });
    const member = trainer
      ? await prisma.memberDetails.findFirst({ where: { userId, gymId: trainer.gymId, status: 'ACTIVE' }, select: { id: true } })
      : null;
    if (!member) {
      return res.status(403).json({ error: 'You can only view trainers at your own gym' });
    }

    const taken = await prisma.booking.findMany({
      where: { date, status: { not: 'CANCELLED' }, OR: [{ trainerId }, { userId }] },
      select: { time: true },
    });
    const busy = new Set(taken.map((b) => b.time));
    const now = new Date();
    res.json(SLOT_TIMES.map((time) => ({ time, available: !busy.has(time) && slotInstant(date, time) > now })));
  } catch {
    res.status(500).json({ error: 'Failed to load slots' });
  }
};

// Member: move one of their own upcoming sessions to a new slot
export const rescheduleBooking = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id as string;
    const { date, time } = req.body as { date: string; time: string };

    const booking = await prisma.booking.findUnique({ where: { id }, include: { trainer: { select: { username: true } } } });
    if (!booking || booking.userId !== userId) return res.status(404).json({ error: 'Booking not found' });
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return res.status(400).json({ error: 'Only upcoming sessions can be rescheduled' });
    }
    if (Number.isNaN(slotInstant(date, time).getTime()) || slotInstant(date, time) < new Date()) {
      return res.status(400).json({ error: 'Booking must be in the future' });
    }

    const clash = await prisma.booking.findFirst({
      where: { id: { not: id }, date, time, status: { not: 'CANCELLED' }, OR: [{ trainerId: booking.trainerId }, { userId }] },
    });
    if (clash) return res.status(409).json({ error: 'That time slot is not available' });

    // The trainer has to agree to the new time again.
    const updated = await prisma.booking.update({ where: { id }, data: { date, time, status: 'PENDING' } });
    await createNotification({
      userId: booking.trainerId,
      type: 'INFO',
      title: 'Session rescheduled',
      message: `A member moved their PT session to ${date} at ${time}. Please confirm it.`,
      link: '/dashboard',
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to reschedule booking' });
  }
};

// Member: create a booking
export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { trainerId, date, time, notes } = req.body;

    // Validate trainer exists and is a real trainer
    const trainer = await prisma.user.findUnique({
      where: { id: trainerId },
      select: { id: true, role: true, trainerDetails: { select: { id: true, gymId: true, status: true } } },
    });
    if (!trainer || trainer.role !== 'TRAINER' || trainer.trainerDetails?.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Selected trainer is not valid' });
    }

    // The member's row at the trainer's gym; they may belong to other gyms too.
    const member = await prisma.memberDetails.findUnique({
      where: { userId_gymId: { userId, gymId: trainer.trainerDetails.gymId } },
      select: { status: true },
    });
    if (!member || member.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'You can only book trainers at your own gym' });
    }

    // A member can only book a trainer in the past is not allowed
    // date/time are the gym's wall clock, not the server's.
    const [hours, minutes] = time.split(':').map(Number);
    const bookingDateTime = new Date(startOfDayIn(new Date(`${date}T12:00:00Z`)).getTime() + (hours * 60 + minutes) * 60_000);
    if (Number.isNaN(bookingDateTime.getTime()) || bookingDateTime < new Date()) {
      return res.status(400).json({ error: 'Booking must be in the future' });
    }

    // Prevent duplicates: same slot for the trainer, or same slot for the member
    const existingTrainer = await prisma.booking.findFirst({
      where: { trainerId, date, time, status: { notIn: ['CANCELLED'] } },
    });
    if (existingTrainer) {
      return res.status(409).json({ error: 'This time slot is already booked' });
    }

    const existingMember = await prisma.booking.findFirst({
      where: { userId, date, time, status: { notIn: ['CANCELLED'] } },
    });
    if (existingMember) {
      return res.status(409).json({ error: 'You already have a training session at this time' });
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        trainerId,
        gymId: trainer.trainerDetails.gymId,
        date,
        time,
        notes: notes || null,
        status: 'PENDING',
      },
      include: {
        trainer: { select: { username: true } },
        gym: { select: { name: true } },
      },
    });

    // Notify the trainer and the gym owner about the new booking request.
    await createNotification({
      userId: trainerId,
      type: 'INFO',
      title: 'New booking request',
      message: `A member requested a PT session on ${date} at ${time}.`,
      link: '/dashboard',
    });
    const gym = await prisma.gym.findUnique({
      where: { id: trainer.trainerDetails.gymId },
      select: { ownerId: true },
    });
    if (gym) {
      await createNotification({
        userId: gym.ownerId,
        type: 'INFO',
        title: 'New PT booking',
        message: `A new PT session was booked for ${date} at ${time}.`,
        link: '/admin/gym',
      });
    }

    res.status(201).json(booking);
  } catch {
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

// Member: my bookings
export const getMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const gymId = requestedGymId(req);
    const bookings = await prisma.booking.findMany({
      where: { userId, ...(gymId ? { gymId } : {}) },
      include: {
        trainer: { select: { username: true, email: true } },
        gym: { select: { name: true, city: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    res.json(bookings);
  } catch {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

// Trainer: sessions booked with me (filterable by date range / status)
export const getTrainerBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { from, to, status } = req.query as { from?: string; to?: string; status?: string };

    let dateFilter: any = {};
    if (from || to) {
      dateFilter.date = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const bookings = await prisma.booking.findMany({
      where: {
        trainerId: userId,
        ...(status ? { status } : {}),
        ...dateFilter,
      },
      include: {
        user: { select: { username: true, email: true, phone: true } },
        gym: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    res.json(bookings);
  } catch {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

// Gym Admin: all bookings for their gym (filterable)
export const getGymBookings = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { from, to, status } = req.query as { from?: string; to?: string; status?: string };

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (!(await canAccessGym(req.user, gymId))) return res.status(403).json({ error: 'Unauthorized' });

    let dateFilter: any = {};
    if (from || to) {
      dateFilter.date = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const bookings = await prisma.booking.findMany({
      where: {
        gymId,
        ...(status ? { status } : {}),
        ...dateFilter,
      },
      include: {
        user: { select: { username: true, email: true, phone: true } },
        trainer: { select: { username: true, email: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    res.json(bookings);
  } catch {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

// Change booking status: member can cancel; trainer can confirm/cancel/complete;
// gym admin can manage all bookings at their gym.
export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true } },
        trainer: { select: { id: true, username: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (role === 'MEMBER') {
      if (booking.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });
      if (status !== 'CANCELLED' || !['PENDING', 'CONFIRMED'].includes(booking.status)) {
        return res.status(400).json({ error: 'Members can only cancel a session' });
      }
    } else if (role === 'TRAINER') {
      if (booking.trainerId !== userId) return res.status(403).json({ error: 'Unauthorized' });
      if (!['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status transition' });
      }
    } else if (role === 'GYM_ADMIN' || role === 'SUPER_ADMIN') {
      if (!(await canAccessGym(req.user, booking.gymId))) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      if (!['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status transition' });
      }
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { username: true } },
        trainer: { select: { username: true } },
      },
    });

    // Notify the affected member about the status change.
    await createNotification({
      userId: booking.userId,
      type: status === 'CANCELLED' ? 'WARNING' : status === 'CONFIRMED' ? 'SUCCESS' : 'INFO',
      title: 'PT session updated',
      message: `Your session with ${booking.trainer.username} on ${booking.date} at ${booking.time} is now ${status}.`,
      link: '/dashboard',
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update booking' });
  }
};