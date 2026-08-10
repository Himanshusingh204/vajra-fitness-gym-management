import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';

// Ensure the caller can manage notices for this gym (owner or Super Admin).
const assertManager = async (gymId: string, userId?: string, role?: string) => {
  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!gym) return { gym: null as null, ok: false };
  const ok = role === 'SUPER_ADMIN' || (userId != null && gym.ownerId === userId);
  return { gym, ok };
};

// List announcements for a gym (Gym Admin / Super Admin)
export const getGymNotices = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { ok } = await assertManager(gymId, req.user?.userId, req.user?.role);
    if (!ok) return res.status(403).json({ error: 'Unauthorized' });

    const notices = await prisma.notice.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notices);
  } catch {
    res.status(500).json({ error: 'Failed to fetch notices' });
  }
};

// Create an announcement (Gym Admin / Super Admin)
export const createNotice = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { ok } = await assertManager(gymId, req.user?.userId, req.user?.role);
    if (!ok) return res.status(403).json({ error: 'Unauthorized' });

    const { title, content } = req.body;
    const notice = await prisma.notice.create({
      data: { gymId, title, content },
    });

    await logAudit({
      action: 'NOTICE_CREATED',
      entity: 'Notice',
      entityId: notice.id,
      details: JSON.stringify({ gymId, title }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(notice);
  } catch {
    res.status(500).json({ error: 'Failed to create notice' });
  }
};

// Update an announcement (Gym Admin / Super Admin)
export const updateNotice = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const notice = await prisma.notice.findUnique({ where: { id }, select: { id: true, gymId: true } });
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    const { ok } = await assertManager(notice.gymId, req.user?.userId, req.user?.role);
    if (!ok) return res.status(403).json({ error: 'Unauthorized' });

    const { title, content } = req.body;
    const updated = await prisma.notice.update({
      where: { id },
      data: { title, content },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update notice' });
  }
};

// Delete an announcement (Gym Admin / Super Admin)
export const deleteNotice = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const notice = await prisma.notice.findUnique({ where: { id }, select: { id: true, gymId: true } });
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    const { ok } = await assertManager(notice.gymId, req.user?.userId, req.user?.role);
    if (!ok) return res.status(403).json({ error: 'Unauthorized' });

    await prisma.notice.delete({ where: { id } });
    res.json({ message: 'Notice deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete notice' });
  }
};

// Announcements for the caller's gym (members / trainers / staff see these)
export const getMyGymNotices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [member, trainer, staff] = await Promise.all([
      prisma.memberDetails.findUnique({ where: { userId }, select: { gymId: true } }),
      prisma.trainerDetails.findUnique({ where: { userId }, select: { gymId: true } }),
      prisma.staffDetails.findUnique({ where: { userId }, select: { gymId: true } }),
    ]);

    const gymId = member?.gymId ?? trainer?.gymId ?? staff?.gymId;
    if (!gymId) return res.json([]);

    const notices = await prisma.notice.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notices);
  } catch {
    res.status(500).json({ error: 'Failed to fetch notices' });
  }
};
