import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';
import {
  createMembership,
  renewMembership,
  syncExpiredMemberships,
  withDerivedStatus,
} from '../services/membership.service';

// Ensure expired memberships are flagged before listing.
const syncThen = async () => {
  await syncExpiredMemberships().catch(() => {});
};

// List memberships for a gym (Gym Admin / Super Admin)
export const getMemberships = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { status, memberId } = req.query as { status?: string; memberId?: string };

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await syncThen();

    const where: any = { gymId };
    if (status) where.status = status;
    if (memberId) where.memberId = memberId;

    const memberships = await prisma.membership.findMany({
      where,
      include: {
        member: { include: { user: { select: { id: true, username: true, email: true, phone: true } } } },
        plan: { select: { id: true, name: true, duration: true, price: true } },
      },
      orderBy: { endDate: 'desc' },
      take: 1000,
    });

    res.json(memberships.map(withDerivedStatus));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch memberships' });
  }
};

// List a member's own memberships (member self-service)
export const getMyMemberships = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await syncThen();
    const member = await prisma.memberDetails.findUnique({ where: { userId } });
    if (!member) return res.status(404).json({ error: 'Member profile not found' });

    const memberships = await prisma.membership.findMany({
      where: { memberId: member.id },
      include: { plan: { select: { id: true, name: true, duration: true, price: true } } },
      orderBy: { endDate: 'desc' },
      take: 1000,
    });

    res.json(memberships.map(withDerivedStatus));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch memberships' });
  }
};

// Create a new membership (Gym Admin / Super Admin)
export const createMembershipHandler = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const membership = await createMembership({ ...req.body, gymId });

    await logAudit({
      action: 'MEMBERSHIP_CREATED',
      entity: 'Membership',
      entityId: membership.id,
      details: JSON.stringify({ memberId: req.body.memberId, planId: req.body.planId }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(membership);
  } catch (error: any) {
    const message = error?.message || '';
    if (message.includes('NOT_FOUND')) {
      return res.status(404).json({ error: message.replace('_NOT_FOUND', ' not found') });
    }
    if (message.includes('INVALID')) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    res.status(500).json({ error: 'Failed to create membership' });
  }
};

// Renew an existing membership (Gym Admin / Super Admin)
export const renewMembershipHandler = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const membership = await renewMembership({ ...req.body, gymId });

    await logAudit({
      action: 'MEMBERSHIP_RENEWED',
      entity: 'Membership',
      entityId: membership.id,
      details: JSON.stringify({ previousId: req.body.membershipId }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(membership);
  } catch (error: any) {
    const message = error?.message || '';
    if (message.includes('NOT_FOUND')) {
      return res.status(404).json({ error: message.replace('_NOT_FOUND', ' not found') });
    }
    res.status(500).json({ error: 'Failed to renew membership' });
  }
};

// Fetch a single membership with derived status
export const getMembership = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const membership = await prisma.membership.findUnique({
      where: { id },
      include: {
        member: { include: { user: { select: { id: true, username: true, email: true, phone: true } } } },
        plan: { select: { id: true, name: true, duration: true, price: true } },
        renewals: { orderBy: { createdAt: 'desc' } },
        previousMembership: true,
      },
    });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    const isSelf = membership.member.userId === req.user?.userId;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    if (!isSelf && !isSuperAdmin) {
      const gym = await prisma.gym.findUnique({ where: { id: membership.gymId } });
      if (!gym || gym.ownerId !== req.user?.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    res.json(withDerivedStatus(membership));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch membership' });
  }
};
