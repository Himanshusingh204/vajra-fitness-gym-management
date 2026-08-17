import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import argon2 from 'argon2';
import { prisma } from '../utils/prisma';
import { generateSecureToken, TOKEN_TTL } from '../utils/tokens';
import { FRONTEND_URL } from '../utils/env';
import { notifyGymOwner } from '../services/notification.service';
import { sendActivationEmail } from '../utils/email';
import { assertGymCapacity } from '../services/entitlements.service';
import { logger } from '../utils/logger';

// Get all staff and trainers for a gym
export const getStaff = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { branchId } = req.query;
    
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const where: any = { gymId };
    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: String(branchId), gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to this gym' });
      where.branchId = branchId;
    }

    const trainers = await prisma.trainerDetails.findMany({
      where,
      include: { user: { select: { id: true, username: true, email: true, phone: true } }, branch: { select: { id: true, name: true } } }
    });

    const staff = await prisma.staffDetails.findMany({
      where,
      include: { user: { select: { id: true, username: true, email: true, phone: true } }, branch: { select: { id: true, name: true } } }
    });

    res.json({ trainers, staff });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

// Add Staff or Trainer
export const addStaff = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { username, email, phone, roleType, roleSpecifics, branchId } = req.body; 
    // roleType: "TRAINER" or "STAFF"
    // roleSpecifics: specialization for Trainer, or role name for Staff

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to this gym' });
    }

    // Enforce the gym's SaaS plan capacity before creating another trainer/staff.
    try {
      await assertGymCapacity(gymId, roleType === 'TRAINER' ? { addTrainers: 1 } : { addStaff: 1 });
    } catch (err: any) {
      if (err?.name === 'EntitlementError') return res.status(402).json({ error: err.message.split(':')[2] });
      throw err;
    }

    // No universal default password: the user activates their own password
    // through a one-time secure link.
    const placeholderPassword = await argon2.hash(generateSecureToken(24));

    const user = await prisma.user.create({
      data: {
        username,
        email,
        phone,
        password: placeholderPassword,
        role: roleType,
        ...(roleType === 'TRAINER' ? {
          trainerDetails: {
            create: { gymId, specialization: roleSpecifics, branchId: branchId || null }
          }
        } : {
          staffDetails: {
            create: { gymId, role: roleSpecifics, branchId: branchId || null }
          }
        })
      },
      include: { trainerDetails: true, staffDetails: true }
    });

    const activationToken = generateSecureToken();
    await prisma.activationToken.create({
      data: {
        token: activationToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL.activation),
      },
    });

    // Best-effort; the account and activation link already exist, so an email
    // failure (bad SMTP config, provider outage) shouldn't roll back an
    // otherwise-successful creation.
    const activationLink = `${FRONTEND_URL}/activate?token=${activationToken}`;
    await sendActivationEmail(email, username, activationLink).catch((err) =>
      logger.warn('activation email failed', { email, error: String(err) }),
    );

    await notifyGymOwner({
      gymId,
      type: 'INFO',
      title: roleType === 'TRAINER' ? 'Trainer added' : 'Staff added',
      message: `${username} was added as ${roleSpecifics}.`,
    });

    const { password: _pw, ...safeUser } = user;
    res.status(201).json({ ...safeUser, activationLink });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add staff' });
  }
};

// Delete a staff member or trainer (Gym Admin only)
export const deleteStaff = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const staff = await prisma.staffDetails.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    const trainer = staff ? null : await prisma.trainerDetails.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });

    const detail = staff || trainer;
    if (!detail) return res.status(404).json({ error: 'Staff member not found' });
    if (detail.gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.user.delete({ where: { id: detail.userId } });
    res.json({ message: 'Staff member removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove staff' });
  }
};
