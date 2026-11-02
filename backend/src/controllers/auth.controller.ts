import { Request, Response } from 'express';
import argon2 from 'argon2';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { JWT_SECRET, FRONTEND_URL } from '../utils/env';
import { generateSecureToken, hashToken, TOKEN_TTL } from '../utils/tokens';
import { findMemberProfile, requestedGymId } from '../utils/tenant';
import { findDuplicateGym } from '../utils/duplicateGym';
import { isLocked, registerFailure, clearFailures } from '../utils/bruteForce';
import { createNotification } from '../services/notification.service';
import { generateRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../services/refreshToken.service';
import { startAutomaticTrial } from '../services/subscription.service';
import { sendPasswordResetEmail } from '../utils/email';
import { logger } from '../utils/logger';

// Brute-force lockout (Redis-backed when available, in-memory fallback).
// see utils/bruteForce.ts for the shared cross-instance implementation.
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('$2')) {
    return bcrypt.compare(password, hash);
  }
  return argon2.verify(hash, password);
}

const issueAccessToken = (user: { id: string; role: string; tokenVersion: number }) =>
  jwt.sign({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });

// Without "remember me" the refresh cookie has no maxAge, so the browser drops
// it on close. The sessionOnly marker tells /refresh to keep it that way.
const setRefreshCookie = (res: Response, refreshToken: string, persistent: boolean) => {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const };
  res.cookie('refreshToken', refreshToken, persistent ? { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 } : options);
  if (persistent) res.clearCookie('sessionOnly');
  else res.cookie('sessionOnly', '1', options);
};

// The mobile app has no cookie jar, so it identifies itself with this header
// and keeps the refresh token in secure storage instead.
const isMobileClient = (req: Request) => req.get('x-client')?.toLowerCase() === 'mobile';

// Web gets the refresh token as an httpOnly cookie, mobile gets it in the body.
// Spread the result into the JSON response.
const handOverRefreshToken = (req: Request, res: Response, refreshToken: string, persistent = true) => {
  if (isMobileClient(req)) return { refreshToken };
  setRefreshCookie(res, refreshToken, persistent);
  return {};
};

const readRefreshToken = (req: Request): string | undefined => {
  const raw = isMobileClient(req) ? req.body?.refreshToken : req.cookies?.refreshToken;
  return typeof raw === 'string' && raw.length > 0 && raw.length <= 256 ? raw : undefined;
};

// Allowed browser origins for cookie-bearing requests (defense-in-depth for CSRF
// on top of SameSite=Strict). Requests without an Origin/Referer header
// (curl, mobile apps using the Authorization header) are unaffected.
const allowedCookieOrigins = Array.from(
  new Set([
    FRONTEND_URL,
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : []),
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
  ]),
);

const hasAllowedOrigin = (req: Request): boolean => {
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) return true; // no browser context (curl/mobile) → skip
  const allowedHosts = allowedCookieOrigins
    .map((u) => {
      try {
        return new URL(u).host;
      } catch {
        return null;
      }
    })
    .filter((h): h is string => h !== null);
  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host;
    const reqHost = req.headers.host;
    // Same-origin deployments (including Vercel) are safe without adding an
    // unbounded hosting-provider wildcard to the cookie allowlist.
    if (originHost === reqHost) return true;
    return allowedHosts.includes(originHost);
  } catch {
    return false;
  }
};

export const registerVendor = async (req: Request, res: Response) => {
  try {
    const { username, email, password, gymName, address, city, state, location, gstNumber, phone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'An account with this email already exists' });

    const duplicate = await findDuplicateGym({ name: gymName, city, phone, gstNumber });
    if (duplicate) return res.status(409).json({ error: duplicate.message });

    const hashedPassword = await argon2.hash(password);

    const vendor = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'GYM_ADMIN',
        phone,
        ownedGyms: {
          create: {
            name: gymName,
            address,
            city,
            state,
            location,
            gstNumber,
            isApproved: false,
            status: 'PENDING_REVIEW',
          },
        },
      },
      include: { ownedGyms: { select: { id: true } } },
    });

    const gym = vendor.ownedGyms[0];
    if (gym) await startAutomaticTrial(gym.id);

    const refreshRaw = await generateRefreshToken(vendor.id);

    res.status(201).json({
      message: 'Vendor registered successfully, pending approval.',
      token: issueAccessToken(vendor),
      ...handOverRefreshToken(req, res, refreshRaw),
      user: { id: vendor.id, username: vendor.username, email: vendor.email, role: vendor.role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const registerMember = async (req: Request, res: Response) => {
  try {
    const { username, email, password, phone, gymId, planId, preferredPaymentMethod, referralCode } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'An account with this email already exists' });

    // Gym selection is optional at signup — a member can create an account
    // and pick a gym later from their dashboard (see enrollMember).
    let gym: Awaited<ReturnType<typeof prisma.gym.findUnique>> = null;
    if (gymId) {
      gym = await prisma.gym.findUnique({ where: { id: gymId } });
      if (!gym) return res.status(404).json({ error: 'Gym not found' });
      if (gym.status !== 'APPROVED') return res.status(403).json({ error: 'Membership registration is closed at this gym' });

      if (planId) {
        const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
        if (!plan) return res.status(404).json({ error: 'Membership plan not found' });
        if (plan.gymId !== gym.id) return res.status(400).json({ error: 'Plan does not belong to the selected gym' });
      }
    }

    const hashedPassword = await argon2.hash(password);

    const member = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'MEMBER',
        phone,
        ...(gym
          ? {
              memberProfiles: {
                create: {
                  gymId: gym.id,
                  planId: planId || undefined,
                  status: 'PENDING', // Self-registration requires gym-admin approval
                  preferredPaymentMethod: preferredPaymentMethod || null,
                },
              },
            }
          : {}),
      },
    });

    const refreshRaw = await generateRefreshToken(member.id);

    if (gym && referralCode) {
      // The account already exists, so a failed referral credit must not turn into a failed signup.
      try {
        // Only credit a code that belongs to a member of the same gym.
        const referrer = await prisma.memberDetails.findFirst({
          where: { referralCode, gymId: gym.id },
          select: { userId: true },
        });
        if (referrer && referrer.userId !== member.id) {
          await prisma.referral.create({
            data: { gymId: gym.id, referrerUserId: referrer.userId, referredUserId: member.id, referralCode },
          });
        }
      } catch (err) {
        logger.errorWith('referral credit failed', err);
      }
    }

    if (gym) {
      await createNotification({
        userId: gym.ownerId,
        type: 'INFO',
        title: 'New member registration',
        message: `${username} registered to join ${gym.name}. Review their membership request.`,
        link: '/admin/gym',
      });
    }

    res.status(201).json({
      message: gym
        ? 'Member registered successfully, pending gym approval.'
        : 'Account created. Browse gyms any time to send a membership request.',
      token: issueAccessToken(member),
      ...handOverRefreshToken(req, res, refreshRaw),
      user: { id: member.id, username: member.username, email: member.email, role: member.role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Trainer self-signup. The account works straight away but stays PENDING (no
// access to gym data) until the gym admin approves it from staff management.
export const registerTrainer = async (req: Request, res: Response) => {
  try {
    const { username, email, password, phone, gymId, specialization, experienceYears, city, bio } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'An account with this email already exists' });

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true, name: true, ownerId: true, status: true } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.status !== 'APPROVED') return res.status(403).json({ error: 'This gym is not accepting trainer applications yet' });

    const hashedPassword = await argon2.hash(password);

    const trainer = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'TRAINER',
        phone,
        trainerDetails: {
          create: {
            gymId: gym.id,
            status: 'PENDING',
            specialization: specialization || null,
            experienceYears: experienceYears ?? null,
            city: city || null,
            bio: bio || null,
          },
        },
      },
    });

    const refreshRaw = await generateRefreshToken(trainer.id);

    await createNotification({
      userId: gym.ownerId,
      type: 'INFO',
      title: 'New trainer application',
      message: `${username} applied to join ${gym.name} as a trainer. Review the application in staff management.`,
      link: '/admin/gym',
    });

    res.status(201).json({
      message: 'Application sent. The gym will review it soon.',
      token: issueAccessToken(trainer),
      ...handOverRefreshToken(req, res, refreshRaw),
      user: { id: trainer.id, username: trainer.username, email: trainer.email, role: trainer.role },
      trainerStatus: 'PENDING',
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// A trainer invited by the gym owner sets a password and is active straight away.
export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const { token, name, password } = req.body as { token: string; name: string; password: string };
    const invite = await prisma.trainerInvite.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!invite || invite.status !== 'PENDING' || invite.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This invitation is invalid or has expired' });
    }
    if (await prisma.user.findUnique({ where: { email: invite.email } })) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const trainer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: name,
          email: invite.email,
          password: await argon2.hash(password),
          role: 'TRAINER',
          trainerDetails: { create: { gymId: invite.gymId, status: 'ACTIVE' } },
        },
      });
      await tx.trainerInvite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
      return user;
    });

    const refreshRaw = await generateRefreshToken(trainer.id);
    res.status(201).json({
      message: 'Welcome to the team.',
      token: issueAccessToken(trainer),
      ...handOverRefreshToken(req, res, refreshRaw),
      user: { id: trainer.id, username: trainer.username, email: trainer.email, role: trainer.role },
      trainerStatus: 'ACTIVE',
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body as { email: string; password: string; rememberMe?: boolean };
    const lockKey = email.toLowerCase();

    const remainingLock = await isLocked(lockKey);
    if (remainingLock > 0) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in a few minutes.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const isMatch = user ? await verifyPassword(password, user.password).catch(() => false) : false;

    if (!user || !isMatch) {
      await registerFailure(lockKey);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    await clearFailures(lockKey);

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    // Migrate legacy bcrypt hashes to argon2 on successful login
    if (user.password.startsWith('$2')) {
      const hashed = await argon2.hash(password);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    }

    const refreshRaw = await generateRefreshToken(user.id);

    res.json({
      message: 'Logged in successfully',
      token: issueAccessToken(user),
      ...handOverRefreshToken(req, res, refreshRaw, rememberMe !== false),
      user:{ id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = readRefreshToken(req);
    if (refreshToken) {
      await revokeRefreshToken(refreshToken).catch(() => {});
    }
  } catch {
    /* logout must never fail the request */
  }
  res.clearCookie('refreshToken');
  res.clearCookie('sessionOnly');
  res.json({ message: 'Logged out successfully' });
};

export const refresh = async (req: Request, res: Response) => {
  try {
    if (!hasAllowedOrigin(req)) {
      return res.status(403).json({ error: 'Cross-origin refresh denied' });
    }

    const refreshToken = readRefreshToken(req);
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    const result = await rotateRefreshToken(refreshToken);
    if (!result.ok) {
      if (!isMobileClient(req)) res.clearCookie('refreshToken');
      const reason = (result as any).reason;
      return res.status(401).json({ error: reason === 'reuse' ? 'Session reuse detected. Please log in again.' : 'Session expired. Please log in again.' });
    }

    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    if (!user) return res.status(401).json({ error: 'Invalid user' });
    if (user.isActive === false) return res.status(403).json({ error: 'Account suspended. Contact support.' });

    res.json({ token: issueAccessToken(user), ...handOverRefreshToken(req, res, result.raw, !req.cookies?.sessionOnly) });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await verifyPassword(currentPassword, user.password).catch(() => false);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    if (user.password.startsWith('$2')) {
      const matchesNew = await bcrypt.compare(newPassword, user.password).catch(() => false);
      if (matchesNew) {
        return res.status(400).json({ error: 'New password must be different from the current password' });
      }
    } else {
      const matchesNew = await argon2.verify(user.password, newPassword).catch(() => false);
      if (matchesNew) {
        return res.status(400).json({ error: 'New password must be different from the current password' });
      }
    }

    const hashed = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });
    await revokeAllUserTokens(userId);

    res.clearCookie('refreshToken');
    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Returns the currently authenticated user with role-specific details.
export const me = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // memberDetails is the member's row at one gym (see findMemberProfile); /members/my-gyms lists them all.
    const member = await findMemberProfile(userId, requestedGymId(req));
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        memberProfiles: {
          where: { id: member?.id ?? '' },
          include: {
            gym: { select: { id: true, name: true, city: true, state: true, location: true } },
            membershipPlan: true,
            memberships: { orderBy: { endDate: 'desc' }, take: 1 },
          },
        },
        trainerDetails: { include: { gym: { select: { id: true, name: true } } } },
        staffDetails: { include: { gym: { select: { id: true, name: true } } } },
        ownedGyms: { select: { id: true, name: true, isApproved: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { memberProfiles, ...rest } = user;
    const body = { ...rest, memberDetails: memberProfiles[0] ?? null };
    res.json(user.role === 'TRAINER' ? { ...body, trainerStatus: user.trainerDetails?.status ?? 'ACTIVE' } : body);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const profileSelect = {
  id: true,
  username: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  trainerDetails: { select: { status: true, gym: { select: { id: true, name: true } } } },
  staffDetails: { select: { gym: { select: { id: true, name: true } } } },
  ownedGyms: { select: { id: true, name: true }, take: 1 },
} as const;

const findProfile = async (userId: string, gymId?: string) => {
  const member = await findMemberProfile(userId, gymId);
  return prisma.user.findUnique({
    where: { id: userId },
    select: { ...profileSelect, memberProfiles: { where: { id: member?.id ?? '' }, select: { gym: { select: { id: true, name: true } } } } },
  });
};

type ProfileRow = NonNullable<Awaited<ReturnType<typeof findProfile>>>;

const toProfile = (user: ProfileRow) => {
  const { memberProfiles, trainerDetails, staffDetails, ownedGyms, ...base } = user;
  const gym = ownedGyms[0] ?? memberProfiles[0]?.gym ?? trainerDetails?.gym ?? staffDetails?.gym ?? null;
  return {
    ...base,
    gym,
    ...(user.role === 'TRAINER' ? { trainerStatus: trainerDetails?.status ?? 'ACTIVE' } : {}),
  };
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await findProfile(userId, requestedGymId(req));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(toProfile(user));
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { username, phone } = req.body as { username?: string; phone?: string | null };
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username !== undefined ? { username } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
    });
    const user = await findProfile(userId, requestedGymId(req));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(toProfile(user));
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Activates an admin-created account using a one-time secure token.
export const activateAccount = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };

    const record = await prisma.activationToken.findUnique({
      where: { tokenHash: hashToken(token || '') },
      include: { user: { select: { id: true, username: true, email: true, role: true, tokenVersion: true } } },
    });
    if (!record) return res.status(400).json({ error: 'Invalid or expired activation link' });
    if (record.usedAt) return res.status(400).json({ error: 'This activation link has already been used' });
    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This activation link has expired. Contact your gym.' });
    }
    if (!password) return res.status(400).json({ error: 'Password is required' });

    // Claim the token before using it so two concurrent requests can't both pass.
    const claimed = await prisma.activationToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count === 0) return res.status(400).json({ error: 'This activation link has already been used' });

    const hashed = await argon2.hash(password);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed, isActive: true, tokenVersion: { increment: 1 } },
    });

    const refreshRaw = await generateRefreshToken(record.userId);
    setRefreshCookie(res, refreshRaw, true);

    await createNotification({
      userId: record.userId,
      type: 'SUCCESS',
      title: 'Welcome!',
      message: 'Your account has been activated. You can now access your dashboard.',
      link: '/dashboard',
    });

    res.json({
      message: 'Account activated successfully.',
      token: issueAccessToken(record.user),
      user: { id: record.user.id, username: record.user.username, email: record.user.email, role: record.user.role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate account' });
  }
};

// Initiates a password reset. Returns the reset link in non-production when
// no email provider is configured (safe development mechanism).
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase() || '' } });

    // Always return the same message to avoid account enumeration.
    const generic = 'If an account exists for this email, a reset link has been generated.';

    if (!user || user.isActive === false) {
      return res.json({ message: generic });
    }

    const token = generateSecureToken();
    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL.passwordReset),
      },
    });

    // Best-effort: the reset token already exists, and failing the whole
    // request on an email-delivery error would both break the flow for a
    // valid account and (since non-existent accounts never reach this line)
    // leak account existence via a differing response.
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetLink).catch((err) =>
      logger.warn('password reset email failed', { email: user.email, error: String(err) }),
    );

    res.json({ message: generic, ...(process.env.NODE_ENV === 'development' ? { resetLink } : {}) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

// Completes the password reset using a one-time token.
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token || '') },
    });
    if (!record || record.usedAt) {
      return res.status(400).json({ error: 'Invalid or already used reset token' });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }
    if (!newPassword) return res.status(400).json({ error: 'New password is required' });

    // Claim the token before using it so two concurrent requests can't both pass.
    const claimed = await prisma.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count === 0) return res.status(400).json({ error: 'Invalid or already used reset token' });

    const hashed = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });
    // Any pending activation tokens become invalid once the password is set.
    await prisma.activationToken.deleteMany({ where: { userId: record.userId } });
    // Revoke all outstanding refresh sessions so old sessions can't linger.
    await revokeAllUserTokens(record.userId);

    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
