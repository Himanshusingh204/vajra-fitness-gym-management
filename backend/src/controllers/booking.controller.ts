import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { createNotification } from '../services/notification.service';

// Public: list all active trainers (with their gym) so a member can pick one
export const listTrainers = async (_req: AuthRequest, res: Response) => {
  try {
    const { gymId } = _req.query as { gymId?: string };
    const trainers = await prisma.trainerDetails.findMany({
      where: { ...(gymId ? { gymId, gym: { isApproved: true } } : { gym: { isApproved: true } }) },
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

// Member: create a booking
export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { trainerId, date, time, notes } = req.body;

    // Validate trainer exists and is a real trainer
    const trainer = await prisma.user.findUnique({
      where: { id: trainerId },
      select: { id: true, role: true, trainerDetails: { select: { id: true, gymId: true } } },
    });
    if (!trainer || trainer.role !== 'TRAINER' || !trainer.trainerDetails) {
      return res.status(400).json({ error: 'Selected trainer is not valid' });
    }

    const member = await prisma.memberDetails.findFirst({
      where: { userId },
      select: { gymId: true, status: true },
    });
    if (!member || member.status !== 'ACTIVE' || member.gymId !== trainer.trainerDetails.gymId) {
      return res.status(403).json({ error: 'You can only book trainers at your own gym' });
    }

    // A member can only book a trainer in the past is not allowed
    const bookingDateTime = new Date(`${date}T${time}:00`);
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

    const bookings = await prisma.booking.findMany({
      where: { userId },
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

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

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
        gym: { select: { ownerId: true } },
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
      if (role === 'GYM_ADMIN' && booking.gym.ownerId !== userId) {
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