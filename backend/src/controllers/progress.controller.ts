import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';

const computeBmi = (weight: number, heightCm: number): number | null => {
  if (!heightCm || heightCm <= 0) return null;
  const h = heightCm / 100;
  return Number((weight / (h * h)).toFixed(1));
};

export const addProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { weight, height, bodyFat } = req.body;

    const log = await prisma.progressLog.create({
      data: { userId, weight, height: height || null, bodyFat: bodyFat || null },
    });
    res.status(201).json({ ...log, bmi: computeBmi(weight, height) });
  } catch {
    res.status(500).json({ error: 'Failed to save progress' });
  }
};

export const getMyProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const logs = await prisma.progressLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const latest = logs[0];
    const first = logs[logs.length - 1];
    const bmi = latest ? computeBmi(latest.weight, latest.height || 0) : null;

    res.json({
      logs,
      latest: latest ?? null,
      bmi,
      weightChange:
        logs.length >= 2 && latest && first ? Number((latest.weight - first.weight).toFixed(1)) : null,
      entries: logs.length,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

// A member's assigned trainer, their gym admin, or a Super Admin can review
// progress trends to inform workout planning. Members manage their own
// entries via /my; this is read-only for staff.
export const getMemberProgress = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.memberId as string;

    const member = await prisma.memberDetails.findUnique({
      where: { id: memberId },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    let isTrainerAtGym = false;
    if (req.user?.role === 'TRAINER') {
      const trainer = await prisma.trainerDetails.findFirst({
        where: { userId: req.user.userId, gymId: member.gymId },
      });
      isTrainerAtGym = !!trainer;
    }

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const isGymOwner = req.user?.userId === member.gym.ownerId;
    if (!isSuperAdmin && !isGymOwner && !isTrainerAtGym) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const logs = await prisma.progressLog.findMany({
      where: { userId: member.userId },
      orderBy: { date: 'desc' },
    });

    const latest = logs[0];
    const first = logs[logs.length - 1];
    const bmi = latest ? computeBmi(latest.weight, latest.height || 0) : null;

    res.json({
      logs,
      latest: latest ?? null,
      bmi,
      weightChange:
        logs.length >= 2 && latest && first ? Number((latest.weight - first.weight).toFixed(1)) : null,
      entries: logs.length,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch member progress' });
  }
};