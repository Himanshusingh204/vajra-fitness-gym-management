import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';
import { assertGymCapacity } from '../services/entitlements.service';

// =====================================================================
// CLASS / GROUP FITNESS CONTROLLER
// Routes: class.routes.ts
// Responsibilities: class CRUD, member booking with capacity + waitlist,
// booking cancellation (promotes the next waitlisted member).
// Tenant safety: gym ownership is verified on every read/write.
// =====================================================================

// Helper: verify the requesting user owns the gym (or is SUPER_ADMIN).
const assertGymOwner = async (gymId: string, userId: string | undefined, role: string | undefined) => {
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true, ownerId: true } });
  if (!gym) return false;
  if (role === 'SUPER_ADMIN') return true;
  return gym.ownerId === userId;
};

// List classes for a gym (public).
export const getClasses = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { day, branchId } = req.query as { day?: string; branchId?: string };

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to this gym' });
    }

    const where: any = { gymId, isActive: true };
    if (day) where.dayOfWeek = day;
    if (branchId) where.branchId = branchId;

    const classes = await prisma.gymClass.findMany({
      where,
      include: {
        trainer: { include: { user: { select: { id: true, username: true } } } },
        branch: { select: { id: true, name: true } },
        _count: { select: { bookings: { where: { status: 'BOOKED' } } } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
};

// Create a class (gym owner / super admin).
export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { name, description, capacity, duration, dayOfWeek, startTime, endTime, location, trainerId, branchId } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (!(await assertGymOwner(gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate trainer/branch belong to this gym (prevents cross-tenant references).
    if (trainerId) {
      const trainer = await prisma.trainerDetails.findFirst({ where: { id: trainerId, gymId } });
      if (!trainer) return res.status(400).json({ error: 'Trainer does not belong to this gym' });
    }
    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to this gym' });
    }

    // Enforce class limit (unless super admin).
    if (req.user?.role !== 'SUPER_ADMIN') {
      try {
        await assertGymCapacity(gymId, { addClasses: 1 });
      } catch (err: any) {
        if (err?.name === 'EntitlementError') return res.status(402).json({ error: err.message.split(':')[2] });
        throw err;
      }
    }

    const gymClass = await prisma.gymClass.create({
      data: {
        gymId,
        name,
        description: description ?? null,
        capacity: capacity ?? 20,
        duration: duration ?? 60,
        dayOfWeek: dayOfWeek ?? null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        location: location ?? null,
        trainerId: trainerId ?? null,
        branchId: branchId ?? null,
      },
      include: {
        trainer: { include: { user: { select: { id: true, username: true } } } },
      },
    });

    await logAudit({
      action: 'CLASS_CREATED',
      entity: 'GymClass',
      entityId: gymClass.id,
      details: JSON.stringify({ name, dayOfWeek }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(gymClass);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create class' });
  }
};

// POST /api/classes/:classId/book — member books a class.
// If the class is full the member is placed on the waitlist (WAITLISTED).
export const bookClass = async (req: AuthRequest, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const member = await prisma.memberDetails.findFirst({ where: { userId, status: 'ACTIVE' } });
    if (!member) return res.status(403).json({ error: 'Only active members can book classes' });

    const gymClass = await prisma.gymClass.findUnique({ where: { id: classId } });
    if (!gymClass) return res.status(404).json({ error: 'Class not found' });
    if (gymClass.gymId !== member.gymId) return res.status(403).json({ error: 'You can only book classes at your gym' });

    // Count current confirmed bookings.
    const currentBookings = await prisma.classBooking.count({
      where: { classId, status: 'BOOKED' },
    });

    // Check for an existing booking/waitlist entry for this member.
    const existing = await prisma.classBooking.findUnique({
      where: { memberId_classId: { memberId: member.id, classId } },
    });
    if (existing && (existing.status === 'BOOKED' || existing.status === 'WAITLISTED')) {
      return res.status(409).json({
        error: existing.status === 'BOOKED' ? 'You already have a booking for this class' : 'You are already on the waitlist for this class',
        waitlist: existing.status === 'WAITLISTED',
      });
    }

    // If capacity is reached, place the member on the waitlist instead of rejecting.
    if (currentBookings >= gymClass.capacity) {
      const waitlisted = await prisma.classBooking.upsert({
        where: { memberId_classId: { memberId: member.id, classId } },
        update: { status: 'WAITLISTED' },
        create: { memberId: member.id, classId, status: 'WAITLISTED' },
      });
      return res.status(201).json({ ...waitlisted, waitlist: true, position: currentBookings - gymClass.capacity + 1 });
    }

    // Capacity available: confirm the booking.
    const booking = await prisma.classBooking.upsert({
      where: { memberId_classId: { memberId: member.id, classId } },
      update: { status: 'BOOKED' },
      create: { memberId: member.id, classId, status: 'BOOKED' },
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to book class' });
  }
};

// Cancel a class booking (self / gym owner / super admin).
// When a confirmed slot frees, the earliest waitlisted member is promoted.
export const cancelClassBooking = async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = req.params.id as string;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await prisma.classBooking.findUnique({
      where: { id: bookingId },
      include: { member: { select: { userId: true } }, gymClass: { select: { gymId: true } } },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isSelf = booking.member.userId === userId;
    const isGymOwner = await assertGymOwner(booking.gymClass.gymId, userId, req.user?.role);

    if (!isSelf && !isGymOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Cancel the booking; if it was a confirmed slot, promote the next waitlisted member.
    const updated = await prisma.classBooking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    if (updated.status === 'CANCELLED') {
      const nextWaitlisted = await prisma.classBooking.findFirst({
        where: { classId: booking.classId, status: 'WAITLISTED' },
        orderBy: { createdAt: 'asc' },
      });
      if (nextWaitlisted) {
        await prisma.classBooking.update({
          where: { id: nextWaitlisted.id },
          data: { status: 'BOOKED' },
        });
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

// Update class (gym owner / super admin). Also validates trainer/branch belong to gym.
export const updateClass = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const gymClass = await prisma.gymClass.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!gymClass) return res.status(404).json({ error: 'Class not found' });
    if (!(await assertGymOwner(gymClass.gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, description, capacity, duration, dayOfWeek, startTime, endTime, location, trainerId, branchId, isActive } = req.body;

    if (trainerId) {
      const trainer = await prisma.trainerDetails.findFirst({ where: { id: trainerId, gymId: gymClass.gymId } });
      if (!trainer) return res.status(400).json({ error: 'Trainer does not belong to this gym' });
    }
    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, gymId: gymClass.gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to this gym' });
    }

    const updated = await prisma.gymClass.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(capacity !== undefined ? { capacity } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(dayOfWeek !== undefined ? { dayOfWeek } : {}),
        ...(startTime !== undefined ? { startTime } : {}),
        ...(endTime !== undefined ? { endTime } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(trainerId !== undefined ? { trainerId } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update class' });
  }
};

// Delete class (gym owner / super admin).
export const deleteClass = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const gymClass = await prisma.gymClass.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!gymClass) return res.status(404).json({ error: 'Class not found' });
    if (!(await assertGymOwner(gymClass.gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.gymClass.delete({ where: { id } });
    res.json({ message: 'Class deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete class' });
  }
};

// GET /api/classes/:classId/bookings — list bookings for a class (gym owner / super admin).
export const getClassBookings = async (req: AuthRequest, res: Response) => {
  try {
    const classId = req.params.classId as string;

    // Tenant isolation: verify the caller owns the class's gym.
    const gymClass = await prisma.gymClass.findUnique({
      where: { id: classId },
      select: { id: true, gymId: true },
    });
    if (!gymClass) return res.status(404).json({ error: 'Class not found' });
    if (!(await assertGymOwner(gymClass.gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const bookings = await prisma.classBooking.findMany({
      where: { classId },
      include: { member: { include: { user: { select: { id: true, username: true, email: true, phone: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};
