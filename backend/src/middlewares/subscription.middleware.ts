import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { JWT_SECRET } from '../utils/env';
import { AuthRequest } from './auth.middleware';
import { loadSubscriptionInfo, SubscriptionInfo } from '../services/entitlements.service';

export type { SubscriptionInfo, SubscriptionStatus } from '../services/entitlements.service';

// Centralized subscription access control. Every tenant API request passes
// through this middleware before the router, so it works out the caller and
// their gym itself.

export interface SubscriptionRequest extends AuthRequest {
  callerId?: string;
  gymId?: string;
  subscription?: SubscriptionInfo | null;
}

// This runs before the routers' own authenticate, so it reads the bearer
// token itself. A missing or bad token is left for the router to reject.
const identifyCaller = async (req: SubscriptionRequest): Promise<{ userId: string; role: string } | null> => {
  if (req.user) return req.user;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string; tokenVersion: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true, tokenVersion: true },
    });
    if (!user || !user.isActive || user.tokenVersion !== decoded.tokenVersion) return null;
    return { userId: user.id, role: user.role };
  } catch {
    return null;
  }
};

const resolveOwnGymId = async (user: { userId: string; role: string }): Promise<string | null> => {
  const where = { userId: user.userId };
  switch (user.role) {
    case 'GYM_ADMIN':
      return (await prisma.gym.findFirst({ where: { ownerId: user.userId }, select: { id: true } }))?.id ?? null;
    case 'MEMBER':
      return (await prisma.memberDetails.findFirst({ where, select: { gymId: true } }))?.gymId ?? null;
    case 'TRAINER':
      return (await prisma.trainerDetails.findFirst({ where, select: { gymId: true } }))?.gymId ?? null;
    case 'STAFF':
      return (await prisma.staffDetails.findFirst({ where, select: { gymId: true } }))?.gymId ?? null;
    default:
      return null;
  }
};

// Short-lived in-memory cache so a burst of requests does not hit the DB for
// the same gym every time. Cleared whenever a subscription changes.
const subscriptionCache = new Map<string, { data: SubscriptionInfo | null; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

const getSubscriptionInfo = async (gymId: string): Promise<SubscriptionInfo | null> => {
  const cached = subscriptionCache.get(gymId);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const info = await loadSubscriptionInfo(gymId);
  subscriptionCache.set(gymId, { data: info, expiresAt: Date.now() + CACHE_TTL_MS });
  return info;
};

export const clearSubscriptionCache = (gymId: string) => {
  subscriptionCache.delete(gymId);
};

// Super Admins bypass subscription checks (platform management).
export const requireValidSubscription = async (req: SubscriptionRequest, res: Response, next: NextFunction) => {
  try {
    const caller = await identifyCaller(req);
    if (!caller) return next();
    req.callerId = caller.userId;
    if (caller.role === 'SUPER_ADMIN') return next();

    const gymId = await resolveOwnGymId(caller);
    if (!gymId) return next();

    req.gymId = gymId;
    const info = await getSubscriptionInfo(gymId);

    if (info && (info.status === 'SUSPENDED' || info.status === 'CANCELLED')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_' + info.status,
          message: `Your subscription is ${info.status.toLowerCase()}. Contact support to restore access.`,
        },
      });
    }

    // null (gym without any plan) is read-only, like an expired plan.
    req.subscription = info;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware: Block write operations when subscription is expired/suspended.
// Read-only requests (GET/HEAD/OPTIONS) always pass so dashboards stay viewable
// in read-only mode; mutations are blocked until the subscription is renewed.
export const requireWriteAccess = (req: SubscriptionRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'SUPER_ADMIN') return next();

  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  const noPlan = !!req.gymId && !req.subscription;
  if (noPlan || req.subscription?.isReadonly) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_READONLY',
        message: noPlan
          ? 'Your gym has no active plan. Choose a plan to restore full access.'
          : 'Your subscription has expired. Renew your subscription to restore full access.',
      },
    });
  }

  next();
};

// Middleware: Require a specific feature to be enabled.
export const requireFeature = (featureCode: string) => {
  return (req: SubscriptionRequest, res: Response, next: NextFunction) => {
    if (req.user?.role === 'SUPER_ADMIN') return next();

    // No gym context (public route) → nothing to gate.
    if (!req.gymId) return next();

    if (!isFeatureEnabled(req.subscription, featureCode)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_ENTITLED',
          message: `The "${featureCode}" feature is not available in your current plan. Upgrade to access this feature.`,
        },
      });
    }

    next();
  };
};

// Helper: Check if a subscription allows a specific feature (for use in controllers).
export const isFeatureEnabled = (subscription: SubscriptionInfo | null | undefined, featureCode: string): boolean =>
  !!subscription && !subscription.isReadonly && subscription.features.includes(featureCode);
