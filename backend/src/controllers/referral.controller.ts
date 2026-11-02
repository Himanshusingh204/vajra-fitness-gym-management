import crypto from 'crypto';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { canAccessGym, findMemberProfile, requestedGymId } from '../utils/tenant';
import { logAudit } from '../utils/audit';

// =====================================================================
// REFERRAL CONTROLLER (Referral Program)
// Routes: referral.routes.ts
// Responsibilities: list/create/update referral records and gym stats.
// Tenant safety: every handler verifies the caller owns (or is a Super
// Admin of) the gym before touching any referral data.
// =====================================================================

// Helper: resolve a referral's gym and verify ownership by referral id.
const assertReferralGymAccess = async (referralId: string, user: AuthRequest['user']) => {
  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    select: { id: true, gymId: true },
  });
  if (!referral) return { ok: false as const, referral: null };
  const ok = await canAccessGym(user, referral.gymId);
  return { ok, referral };
};

// GET /api/referrals/me — a member's own share code (created on first use) and their referrals.
export const getMyReferrals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const member = await findMemberProfile(userId, requestedGymId(req));
    if (!member) return res.status(404).json({ error: 'Member profile not found' });

    let code = member.referralCode;
    for (let attempt = 0; !code && attempt < 5; attempt++) {
      try {
        // referralCode IS NULL guards against two first visits racing to set different codes.
        await prisma.memberDetails.updateMany({
          where: { id: member.id, referralCode: null },
          data: { referralCode: `VF${crypto.randomBytes(4).toString('hex').toUpperCase()}` },
        });
        code = (await prisma.memberDetails.findUnique({ where: { id: member.id }, select: { referralCode: true } }))?.referralCode ?? null;
      } catch (err) {
        // Unique clash with another member's code: roll a new one.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      }
    }
    if (!code) throw new Error('Could not generate a unique referral code');

    const rows = await prisma.referral.findMany({
      where: { referrerUserId: userId, gymId: member.gymId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, rewardType: true, rewardValue: true, createdAt: true },
    });
    const referrals = rows.map((r) => ({ ...r, rewardValue: r.rewardValue ? r.rewardValue.toNumber() : null }));
    res.json({ code, referrals });
  } catch (error) {
    console.error('Get my referrals error:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
};

// GET /api/referrals/gym/:gymId — list referrals for a gym (owner / super admin).
export const getReferrals = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;

    // Tenant isolation: verify the caller owns this gym.
    if (!(await canAccessGym(req.user, gymId))) {
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
    if (!(await canAccessGym(req.user, gymId))) {
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
        referralCode: `REF-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
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
    const access = await assertReferralGymAccess(id, req.user);
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
    if (!(await canAccessGym(req.user, gymId))) {
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
