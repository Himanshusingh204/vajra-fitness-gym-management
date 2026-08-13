import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';

// =====================================================================
// REFERRAL CONTROLLER (Referral Program)
// Routes: referral.routes.ts
// Responsibilities: list/create/update referral records and gym stats.
// Tenant safety: every handler verifies the caller owns (or is a Super
// Admin of) the gym before touching any referral data.
// =====================================================================

// Helper: verify the requesting user owns the gym (or is SUPER_ADMIN).
const assertGymOwner = async (gymId: string, userId: string | undefined, role: string | undefined) => {
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true, ownerId: true } });
  if (!gym) return false;
  if (role === 'SUPER_ADMIN') return true;
  return gym.ownerId === userId;
};

// Helper: resolve a referral's gym and verify ownership by referral id.
const assertReferralGymAccess = async (referralId: string, userId: string | undefined, role: string | undefined) => {
  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    select: { id: true, gymId: true },
  });
  if (!referral) return { ok: false as const, referral: null };
  const ok = await assertGymOwner(referral.gymId, userId, role);
  return { ok, referral };
};

// GET /api/referrals/gym/:gymId — list referrals for a gym (owner / super admin).
export const getReferrals = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;

    // Tenant isolation: verify the caller owns this gym.
    if (!(await assertGymOwner(gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const referrals = await prisma.referral.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(referrals);
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
};

// POST /api/referrals/gym/:gymId — record a member referral (owner / super admin).
export const createReferral = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { userId, referredUserId, rewardType, rewardValue } = req.body;

    if (!userId || !referredUserId || !rewardType || rewardValue === undefined || rewardValue === null || rewardValue === '') {
      return res.status(400).json({ error: 'userId, referredUserId, rewardType, and rewardValue are required' });
    }
    const parsedRewardValue = typeof rewardValue === 'number' ? rewardValue : Number(rewardValue);
    if (!Number.isFinite(parsedRewardValue) || parsedRewardValue < 0) {
      return res.status(400).json({ error: 'rewardValue must be a non-negative number' });
    }

    // Tenant isolation: verify the caller owns this gym.
    if (!(await assertGymOwner(gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Both users must be members of THIS gym (prevents cross-tenant referrals).
    const [referrerMember, referredMember] = await Promise.all([
      prisma.memberDetails.findFirst({ where: { userId, gymId }, select: { id: true } }),
      prisma.memberDetails.findFirst({ where: { userId: referredUserId, gymId }, select: { id: true } }),
    ]);
    if (!referrerMember || !referredMember) {
      return res.status(400).json({ error: 'Both users must be members of this gym' });
    }

    // Prevent duplicate referral for the same referred user.
    const existing = await prisma.referral.findFirst({ where: { gymId, referredUserId } });
    if (existing) {
      return res.status(409).json({ error: 'This member has already been referred' });
    }

    const referral = await prisma.referral.create({
      data: {
        gymId,
        referrerUserId: userId,
        referredUserId,
        referralCode: `REF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        rewardType,
        rewardValue: parsedRewardValue,
      },
    });

    await logAudit({
      action: 'REFERRAL_CREATED',
      entity: 'Referral',
      entityId: referral.id,
      details: JSON.stringify({ gymId, referrerUserId: userId, referredUserId }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(referral);
  } catch (error) {
    console.error('Create referral error:', error);
    res.status(500).json({ error: 'Failed to create referral' });
  }
};

// PUT /api/referrals/:id — update referral status (owner / super admin).
export const updateReferralStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Tenant isolation: verify the caller owns the referral's gym.
    const access = await assertReferralGymAccess(id, req.user?.userId, req.user?.role);
    if (!access.ok) return res.status(403).json({ error: 'Unauthorized' });

    const referral = await prisma.referral.update({
      where: { id },
      data: { status },
    });

    await logAudit({
      action: 'REFERRAL_STATUS_UPDATED',
      entity: 'Referral',
      entityId: id,
      details: JSON.stringify({ status, gymId: access.referral?.gymId }),
      userId: req.user?.userId ?? null,
    });

    res.json(referral);
  } catch (error) {
    console.error('Update referral error:', error);
    res.status(500).json({ error: 'Failed to update referral' });
  }
};

// GET /api/referrals/gym/:gymId/stats — referral statistics (owner / super admin).
export const getReferralStats = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;

    // Tenant isolation: verify the caller owns this gym.
    if (!(await assertGymOwner(gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const referrals = await prisma.referral.findMany({
      where: { gymId },
    });

    const totalReferrals = referrals.length;
    const pendingReferrals = referrals.filter((r) => r.status === 'PENDING').length;
    const completedReferrals = referrals.filter((r) => r.status === 'COMPLETED').length;
    const totalRewardValue = referrals
      .filter((r) => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + (r.rewardValue ? r.rewardValue.toNumber() : 0), 0);

    res.json({
      totalReferrals,
      pendingReferrals,
      completedReferrals,
      totalRewardValue,
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
};
