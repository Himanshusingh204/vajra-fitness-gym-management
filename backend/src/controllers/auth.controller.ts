import { Request, Response } from 'express';
import argon2 from 'argon2';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { JWT_SECRET, FRONTEND_URL } from '../utils/env';
import { generateSecureToken, TOKEN_TTL } from '../utils/tokens';
import { isLocked, registerFailure, clearFailures } from '../utils/bruteForce';
import { createNotification } from '../services/notification.service';
import { generateRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../services/refreshToken.service';
import { sendPasswordResetEmail, sendActivationEmail } from '../utils/email';

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

const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
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
    return allowedHosts.includes(new URL(origin).host);
  } catch {
    return false;
  }
};

export const registerVendor = async (req: Request, res: Response) => {
  try {
    const { username, email, password, gymName, address, city, state, location, gstNumber, phone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'An account with this email already exists' });

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
          },
        },
      },
    });

    const refreshRaw = await generateRefreshToken(vendor.id);
    setRefreshCookie(res, refreshRaw);

    res.status(201).json({
      message: 'Vendor registered successfully, pending approval.',
      token: issueAccessToken(vendor),
      user: { id: vendor.id, username: vendor.username, email: vendor.email, role: vendor.role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const registerMember = async (req: Request, res: Response) => {
  try {
    const { username, email, password, phone, gymId, planId, preferredPaymentMethod } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'An account with this email already exists' });

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (!gym.isApproved) return res.status(403).json({ error: 'Membership registration is closed at this gym' });

    if (planId) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(404).json({ error: 'Membership plan not found' });
      if (plan.gymId !== gym.id) return res.status(400).json({ error: 'Plan does not belong to the selected gym' });
    }

    const hashedPassword = await argon2.hash(password);

    const member = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'MEMBER',
        phone,
        memberDetails: {
          create: {
            gymId: gym.id,
            planId: planId || undefined,
            status: 'PENDING', // Self-registration requires gym-admin approval
            preferredPaymentMethod: preferredPaymentMethod || null,
          },
        },
      },
    });

    const refreshRaw = await generateRefreshToken(member.id);
    setRefreshCookie(res, refreshRaw);

    await createNotification({
      userId: gym.ownerId,
      type: 'INFO',
      title: 'New member registration',
      message: `${username} registered to join ${gym.name}. Review their membership request.`,
      link: '/admin/gym',
    });

    res.status(201).json({
      message: 'Member registered successfully, pending gym approval.',
      token: issueAccessToken(member),
      user: { id: member.id, username: member.username, email: member.email, role: member.role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
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
    setRefreshCookie(res, refreshRaw);

    res.json({
      message: 'Logged in successfully',
      token: issueAccessToken(user),
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken).catch(() => {});
    }
  } catch {
    /* logout must never fail the request */
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

export const refresh = async (req: Request, res: Response) => {
  try {
    if (!hasAllowedOrigin(req)) {
      return res.status(403).json({ error: 'Cross-origin refresh denied' });
    }

    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    const result = await rotateRefreshToken(refreshToken);
    if (!result.ok) {
      res.clearCookie('refreshToken');
      const reason = (result as any).reason;
      return res.status(401).json({ error: reason === 'reuse' ? 'Session reuse detected. Please log in again.' : 'Session expired. Please log in again.' });
    }

    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    if (!user) return res.status(401).json({ error: 'Invalid user' });
    if (user.isActive === false) return res.status(403).json({ error: 'Account suspended. Contact support.' });

    setRefreshCookie(res, result.raw);
    res.json({ token: issueAccessToken(user) });
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
        memberDetails: {
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
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Activates an admin-created account using a one-time secure token.
export const activateAccount = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };

    const record = await prisma.activationToken.findUnique({
      where: { token: token || '' },
      include: { user: { select: { id: true, username: true, email: true, role: true, tokenVersion: true } } },
    });
    if (!record) return res.status(400).json({ error: 'Invalid or expired activation link' });
    if (record.usedAt) return res.status(400).json({ error: 'This activation link has already been used' });
    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This activation link has expired. Contact your gym.' });
    }
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const hashed = await argon2.hash(password);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed, isActive: true, tokenVersion: { increment: 1 } },
    });
    await prisma.activationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    const refreshRaw = await generateRefreshToken(record.userId);
    setRefreshCookie(res, refreshRaw);

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
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL.passwordReset),
      },
    });

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetLink);

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
      where: { token: token || '' },
    });
    if (!record || record.usedAt) {
      return res.status(400).json({ error: 'Invalid or already used reset token' });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }
    if (!newPassword) return res.status(400).json({ error: 'New password is required' });

    const hashed = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });
    await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    // Any pending activation tokens become invalid once the password is set.
    await prisma.activationToken.deleteMany({ where: { userId: record.userId } });
    // Revoke all outstanding refresh sessions so old sessions can't linger.
    await revokeAllUserTokens(record.userId);

    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
