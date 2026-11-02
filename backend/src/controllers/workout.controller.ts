import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { canAccessGym } from '../utils/tenant';
import { sendPdf, buildWorkoutSlip } from '../utils/pdf';

// Get workout slips for a member
export const getWorkoutSlips = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.memberId as string;
    
    const member = await prisma.memberDetails.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const isSelf = req.user?.userId === member.userId;
    if (!isSelf && !(await canAccessGym(req.user, member.gymId, ['TRAINER']))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const slips = await prisma.workoutSlip.findMany({
      where: { memberId, gymId: member.gymId },
      include: { trainer: { include: { user: { select: { username: true } } } } },
      orderBy: { assignedDate: 'desc' }
    });
    res.json(slips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout slips' });
  }
};

// Create a workout slip (Trainer of that gym or Gym Admin)
export const createWorkoutSlip = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.memberId as string;
    const { title, exercises, validUntil, trainerId } = req.body;

    const member = await prisma.memberDetails.findUnique({
      where: { id: memberId },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    let effectiveTrainerId = trainerId || null;

    if (req.user?.role === 'SUPER_ADMIN') {
      // allowed, keeps the provided trainerId
    } else if (req.user?.role === 'GYM_ADMIN') {
      if (member.gym.ownerId !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      if (effectiveTrainerId) {
        const trainer = await prisma.trainerDetails.findUnique({ where: { id: effectiveTrainerId } });
        if (!trainer || trainer.gymId !== member.gymId) {
          return res.status(400).json({ error: 'Trainer does not belong to this gym' });
        }
      }
    } else if (req.user?.role === 'TRAINER') {
      const trainer = await prisma.trainerDetails.findFirst({
        where: { userId: req.user.userId, gymId: member.gymId, status: 'ACTIVE' },
      });
      if (!trainer) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      effectiveTrainerId = trainer.id;
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const slip = await prisma.workoutSlip.create({
      data: {
        title: title || null,
        exercises, // stored as string (JSON or text)
        validUntil: validUntil ? new Date(validUntil) : null,
        memberId,
        trainerId: effectiveTrainerId,
        gymId: member.gymId
      }
    });
    res.status(201).json(slip);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workout slip' });
  }
};

// Get all workout slips for a gym (Gym Admin, Super Admin, or Trainer at that gym)
export const getGymWorkoutSlips = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (!(await canAccessGym(req.user, gymId, ['TRAINER']))) return res.status(403).json({ error: 'Unauthorized' });

    const slips = await prisma.workoutSlip.findMany({
      where: { gymId },
      include: {
        member: { include: { user: { select: { username: true, email: true } } } },
        trainer: { include: { user: { select: { username: true } } } },
      },
      orderBy: { assignedDate: 'desc' },
    });
    res.json(slips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout slips' });
  }
};

// Download a workout slip as a PDF
export const getWorkoutSlipPDF = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const slip = await prisma.workoutSlip.findUnique({
      where: { id },
      include: {
        member: { include: { user: { select: { username: true } } } },
        gym: { select: { name: true } },
        trainer: { include: { user: { select: { username: true } } } },
      },
    });
    if (!slip) return res.status(404).json({ error: 'Workout slip not found' });

    // IDOR protection: only the member, or the owner or a trainer of the slip's gym.
    const isSelf = req.user?.userId === slip.member.userId;
    if (!isSelf && !(await canAccessGym(req.user, slip.gymId, ['TRAINER']))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    sendPdf(res, `workout-${slip.id.slice(0, 8)}.pdf`, (doc) =>
      buildWorkoutSlip(doc, {
        slipId: slip.id,
        title: slip.title,
        exercises: slip.exercises,
        assignedDate: slip.assignedDate,
        validUntil: slip.validUntil,
        gymName: slip.gym.name,
        memberName: slip.member.user.username,
        trainerName: slip.trainer?.user?.username ?? null,
      })
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate workout slip' });
  }
};
