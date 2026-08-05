import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import argon2 from 'argon2';
import { logAudit } from '../utils/audit';
import { prisma } from '../utils/prisma';
import { generateSecureToken, TOKEN_TTL } from '../utils/tokens';
import { FRONTEND_URL } from '../utils/env';
import { notifyGymOwner } from '../services/notification.service';
import { sendActivationEmail } from '../utils/email';

// Get all members for a gym (Gym Admin, Super Admin, or Trainer at that gym)
export const getMembers = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    let isTrainerAtGym = false;
    if (req.user?.role === 'TRAINER') {
      const trainer = await prisma.trainerDetails.findFirst({
        where: { userId: req.user.userId, gymId },
      });
      isTrainerAtGym = !!trainer;
    }

    if (req.user?.role !== 'SUPER_ADMIN' && gym.ownerId !== req.user?.userId && !isTrainerAtGym) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const members = await prisma.memberDetails.findMany({
      where: { gymId },
      include: {
        user: { select: { id: true, username: true, email: true, phone: true } },
        membershipPlan: true
      }
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

// Add a member directly by Gym Admin
export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { username, email, phone, planId, status } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || gym.ownerId !== req.user?.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    // No universal default password: the member activates their own password
    // through a one-time secure link.
    const placeholderPassword = await argon2.hash(generateSecureToken(24));

    const member = await prisma.user.create({
      data: {
        username,
        email,
        phone,
        password: placeholderPassword,
        role: 'MEMBER',
        memberDetails: {
          create: {
            gymId,
            planId,
            status: status || 'PENDING',
          },
        },
      },
      include: { memberDetails: true },
    });

    const activationToken = generateSecureToken();
    await prisma.activationToken.create({
      data: {
        token: activationToken,
        userId: member.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL.activation),
      },
    });

    const activationLink = `${FRONTEND_URL}/activate?token=${activationToken}`;
    await sendActivationEmail(email, username, activationLink);

    await notifyGymOwner({
      gymId,
      type: 'INFO',
      title: 'Member added',
      message: `${username} was added as a member.`,
    });

    res.status(201).json({ ...member, activationLink });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
};

// Generates a fresh activation link for a member (Gym Admin / Super Admin)
export const sendActivationLink = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id as string;
    const memberDetails = await prisma.memberDetails.findUnique({
      where: { id: memberId },
      include: { user: { select: { id: true, username: true, email: true } }, gym: { select: { ownerId: true } } },
    });
    if (!memberDetails) return res.status(404).json({ error: 'Member not found' });

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const isGymOwner = req.user?.userId && memberDetails.gym.ownerId === req.user.userId;
    if (!isSuperAdmin && !isGymOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Invalidate any previous unused activation tokens for this user.
    await prisma.activationToken.deleteMany({
      where: { userId: memberDetails.userId, usedAt: null },
    });

    const activationToken = generateSecureToken();
    await prisma.activationToken.create({
      data: {
        token: activationToken,
        userId: memberDetails.userId,
        expiresAt: new Date(Date.now() + TOKEN_TTL.activation),
      },
    });

    const activationLink = `${FRONTEND_URL}/activate?token=${activationToken}`;
    await sendActivationEmail(memberDetails.user.email, memberDetails.user.username, activationLink);

    res.json({ activationLink });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate activation link' });
  }
};

// Get a specific member by ID (Super Admin, owning Gym Admin, or the member themself)
export const getMember = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const memberDetails = await prisma.memberDetails.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, email: true, phone: true } },
        membershipPlan: true,
        gym: { select: { id: true, name: true, ownerId: true } },
      },
    });
    if (!memberDetails) return res.status(404).json({ error: 'Member not found' });

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const isGymOwner = memberDetails.gym.ownerId === req.user?.userId;
    const isSelf = memberDetails.userId === req.user?.userId;
    if (!isSuperAdmin && !isGymOwner && !isSelf) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json(memberDetails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch member' });
  }
};

// Let a logged-in member join a gym / submit a membership request
export const enrollMember = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { gymId, planId } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || !gym.isApproved) return res.status(404).json({ error: 'Gym not found' });

    if (planId) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(404).json({ error: 'Membership plan not found' });
      if (plan.gymId !== gym.id) return res.status(400).json({ error: 'Plan does not belong to the selected gym' });
    }

    const existing = await prisma.memberDetails.findFirst({ where: { userId } });

    if (existing) {
      const updated = await prisma.memberDetails.update({
        where: { id: existing.id },
        data: { gymId, planId: planId || null, status: 'PENDING' },
      });
      return res.json({ message: 'Membership request updated, pending approval.', member: updated });
    }

    const member = await prisma.memberDetails.create({
      data: { userId, gymId, planId: planId || undefined, status: 'PENDING' },
    });
    res.status(201).json({ message: 'Membership request submitted, pending approval.', member });
  } catch {
    res.status(500).json({ error: 'Failed to submit membership request' });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const memberDetails = await prisma.memberDetails.findFirst({
      where: { userId },
      include: { gym: true, membershipPlan: true },
    });

    if (!memberDetails) return res.status(404).json({ error: 'Profile not found' });
    res.json(memberDetails);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
// Update member status or plan (Gym Admin for their gym, or Super Admin)
export const updateMember = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id as string;
    const { status, planId } = req.body;

    const memberDetails = await prisma.memberDetails.findUnique({
      where: { id: memberId },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!memberDetails) return res.status(404).json({ error: 'Member not found' });

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const isGymOwner = req.user?.userId && memberDetails.gym.ownerId === req.user.userId;
    if (!isSuperAdmin && !isGymOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (planId) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (!plan || plan.gymId !== memberDetails.gymId) {
        return res.status(400).json({ error: 'Plan does not belong to the member\'s gym' });
      }
    }

    const updated = await prisma.memberDetails.update({
      where: { id: memberId },
      data: { status, planId },
    });

    await logAudit({
      action: 'MEMBER_UPDATED',
      entity: 'MemberDetails',
      entityId: memberId,
      details: JSON.stringify({ status, planId }),
      userId: req.user?.userId ?? null,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member' });
  }
};
