import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import argon2 from 'argon2';
import { prisma } from '../utils/prisma';
import { canAccessGym } from '../utils/tenant';
import { getOrSetJSON } from '../utils/cache';
import { generateSecureToken, hashToken, TOKEN_TTL } from '../utils/tokens';
import { FRONTEND_URL } from '../utils/env';
import { createNotification, notifyGymOwner } from '../services/notification.service';
import { logAudit } from '../utils/audit';
import { sendActivationEmail, sendTrainerInviteEmail } from '../utils/email';
import { assertGymCapacity } from '../services/entitlements.service';
import { logger } from '../utils/logger';

// Get all staff and trainers for a gym
export const getStaff = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { branchId } = req.query;
    
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || !(await canAccessGym(req.user, gym.id))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const where: any = { gymId };
    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: String(branchId), gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to this gym' });
      where.branchId = branchId;
    }

    // Frontend polls this every 30s — cache briefly so repeat polls hit
    // Redis instead of the DB (same pattern as gym-stats).
    const result = await getOrSetJSON(`staff:${gymId}:${branchId ?? 'all'}`, 15, async () => {
      const [trainers, staff] = await Promise.all([
        // Applications that are pending or rejected have their own endpoint.
        prisma.trainerDetails.findMany({
          where: { ...where, status: 'ACTIVE' },
          include: { user: { select: { id: true, username: true, email: true, phone: true } }, branch: { select: { id: true, name: true } } }
        }),
        prisma.staffDetails.findMany({
          where,
          include: { user: { select: { id: true, username: true, email: true, phone: true } }, branch: { select: { id: true, name: true } } }
        }),
      ]);
      return { trainers, staff };
    });

    res.json(result);
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
    if (!gym || !(await canAccessGym(req.user, gym.id))) {
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
        tokenHash: hashToken(activationToken),
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

const applicationSelect = {
  id: true,
  status: true,
  specialization: true,
  experienceYears: true,
  city: true,
  bio: true,
  joiningDate: true,
  gymId: true,
  user: { select: { id: true, username: true, email: true, phone: true, createdAt: true } },
} as const;

// Trainer self-signups waiting for (or turned down by) this gym.
export const getTrainerApplications = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const status = req.query.status === 'REJECTED' ? 'REJECTED' : 'PENDING';

    if (!(await canAccessGym(req.user, gymId))) return res.status(403).json({ error: 'Unauthorized' });

    const applications = await prisma.trainerDetails.findMany({
      where: { gymId, status },
      select: applicationSelect,
      orderBy: { joiningDate: 'desc' },
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trainer applications' });
  }
};

// Looks up a trainer application the caller is allowed to review. Another
// gym's application reads as not found.
const findApplication = (req: AuthRequest) =>
  prisma.trainerDetails.findFirst({
    where: {
      id: req.params.id as string,
      ...(req.user?.role === 'SUPER_ADMIN' ? {} : { gym: { ownerId: req.user?.userId ?? '' } }),
    },
    include: { gym: { select: { name: true } }, user: { select: { username: true } } },
  });

export const approveTrainerApplication = async (req: AuthRequest, res: Response) => {
  try {
    const application = await findApplication(req);
    if (!application) return res.status(404).json({ error: 'Trainer application not found' });
    if (application.status !== 'PENDING') return res.status(400).json({ error: 'This application has already been reviewed' });

    // The pending trainer is already counted, so this only fails when the
    // gym is over its trainer limit with them included.
    try {
      await assertGymCapacity(application.gymId);
    } catch (err: any) {
      if (err?.name === 'EntitlementError') return res.status(402).json({ error: err.message.split(':')[2] });
      throw err;
    }

    const updated = await prisma.trainerDetails.update({
      where: { id: application.id },
      data: { status: 'ACTIVE', joiningDate: new Date() },
      select: applicationSelect,
    });

    await createNotification({
      userId: application.userId,
      type: 'SUCCESS',
      title: 'Application approved',
      message: `${application.gym.name} approved your trainer application. Welcome to the team.`,
      link: '/dashboard',
    });

    await logAudit({
      action: 'TRAINER_APPROVED',
      entity: 'TrainerDetails',
      entityId: application.id,
      details: JSON.stringify({ gymId: application.gymId, username: application.user.username }),
      userId: req.user?.userId ?? null,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve trainer' });
  }
};

// Rejecting keeps the account (the trainer can still sign in and see the
// outcome); it only blocks access to the gym.
export const rejectTrainerApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body as { reason?: string | null };
    const application = await findApplication(req);
    if (!application) return res.status(404).json({ error: 'Trainer application not found' });
    if (application.status !== 'PENDING') return res.status(400).json({ error: 'This application has already been reviewed' });

    const updated = await prisma.trainerDetails.update({
      where: { id: application.id },
      data: { status: 'REJECTED' },
      select: applicationSelect,
    });

    await createNotification({
      userId: application.userId,
      type: 'ERROR',
      title: 'Application not approved',
      message: `${application.gym.name} did not approve your trainer application.${reason ? ` Reason: ${reason}` : ''}`,
      link: null,
    });

    await logAudit({
      action: 'TRAINER_REJECTED',
      entity: 'TrainerDetails',
      entityId: application.id,
      details: JSON.stringify({ gymId: application.gymId, username: application.user.username, reason: reason || null }),
      userId: req.user?.userId ?? null,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject trainer' });
  }
};

// Delete a staff member or trainer (Gym Admin only)
export const deleteStaff = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const staff = await prisma.staffDetails.findUnique({ where: { id } });
    const trainer = staff ? null : await prisma.trainerDetails.findUnique({ where: { id } });

    const detail = staff || trainer;
    if (!detail) return res.status(404).json({ error: 'Staff member not found' });
    if (!(await canAccessGym(req.user, detail.gymId))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.user.delete({ where: { id: detail.userId } });
    res.json({ message: 'Staff member removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove staff' });
  }
};

// Trainer invites: the owner invites by email, the trainer sets a password from the link.
export const createTrainerInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { email, name } = req.body as { email: string; name?: string };
    const gym = await prisma.gym.findFirst({ where: { ownerId: req.user?.userId ?? '' } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const token = generateSecureToken();
    const invite = await prisma.trainerInvite.create({
      data: {
        email,
        name: name || null,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL.activation),
        gymId: gym.id,
        invitedById: gym.ownerId,
      },
      select: { id: true, email: true, name: true, status: true, expiresAt: true, createdAt: true },
    });

    const link = `${FRONTEND_URL}/accept-invite?token=${token}`;
    await sendTrainerInviteEmail(email, gym.name, link).catch((err) =>
      logger.warn('trainer invite email failed', { email, error: String(err) }),
    );
    res.status(201).json({ ...invite, ...(process.env.NODE_ENV === 'development' ? { link } : {}) });
  } catch {
    res.status(500).json({ error: 'Failed to create invite' });
  }
};

export const listTrainerInvites = async (req: AuthRequest, res: Response) => {
  try {
    const invites = await prisma.trainerInvite.findMany({
      where: { gym: { ownerId: req.user?.userId ?? '' }, status: 'PENDING', expiresAt: { gt: new Date() } },
      select: { id: true, email: true, name: true, status: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    // Only open invites are listed, so these two are always empty here.
    res.json(invites.map((i) => ({ ...i, acceptedAt: null, revokedAt: null })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
};

export const revokeTrainerInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { count } = await prisma.trainerInvite.updateMany({
      where: { id: req.params.id as string, status: 'PENDING', gym: { ownerId: req.user?.userId ?? '' } },
      data: { status: 'REVOKED' },
    });
    if (!count) return res.status(404).json({ error: 'Invite not found' });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Failed to revoke invite' });
  }
};
