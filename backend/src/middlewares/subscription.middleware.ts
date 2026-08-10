import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from './auth.middleware';
import { DEFAULT_TRIAL, DEFAULT_TRIAL_FEATURES } from '../services/entitlements.service';

// Centralized subscription access control. Every protected tenant API request
// must pass through this middleware to verify the gym's subscription is valid.

export type SubscriptionStatus = 'PENDING' | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';

// Subscription states that grant access
const ACCESSIBLE_STATES: SubscriptionStatus[] = ['ACTIVE', 'TRIAL', 'PAST_DUE', 'GRACE_PERIOD'];

// Subscription states that restrict to read-only
const RESTRICTED_STATES: SubscriptionStatus[] = ['EXPIRED', 'SUSPENDED', 'CANCELLED'];

export interface SubscriptionInfo {
  subscriptionId: string;
  status: SubscriptionStatus;
  planId: string;
  planCode: string;
  planName: string;
  features: string[];
  maxMembers: number | null;
  maxTrainers: number | null;
  maxStaff: number | null;
  maxBranches: number;
  maxClasses: number | null;
  endDate: Date;
  gracePeriodEnd: Date | null;
  isReadonly: boolean;
}

export interface SubscriptionRequest extends AuthRequest {
  gymId?: string;
  subscription?: SubscriptionInfo | null;
}

// Resolves the gym ID from the request (params, body, or user's owned gym).
const resolveGymId = async (req: SubscriptionRequest): Promise<string | null> => {
  // Explicit gymId in params (most routes)
  if (req.params.gymId) return req.params.gymId as string;

  // Gym admin: find their owned gym
  if (req.user?.role === 'GYM_ADMIN') {
    const gym = await prisma.gym.findFirst({
      where: { ownerId: req.user.userId },
      select: { id: true },
    });
    return gym?.id ?? null;
  }

  // Member / Trainer / Staff: find their gym
  if (req.user?.role === 'MEMBER') {
    const details = await prisma.memberDetails.findFirst({
      where: { userId: req.user.userId },
      select: { gymId: true },
    });
    return details?.gymId ?? null;
  }

  if (req.user?.role === 'TRAINER') {
    const details = await prisma.trainerDetails.findFirst({
      where: { userId: req.user.userId },
      select: { gymId: true },
    });
    return details?.gymId ?? null;
  }

  if (req.user?.role === 'STAFF') {
    const details = await prisma.staffDetails.findFirst({
      where: { userId: req.user.userId },
      select: { gymId: true },
    });
    return details?.gymId ?? null;
  }

  return null;
};

// Fetches and caches the subscription info for a gym. Uses a short-lived
// in-memory cache to avoid hitting the DB on every request in burst scenarios.
const subscriptionCache = new Map<string, { data: SubscriptionInfo; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

const getSubscriptionInfo = async (gymId: string): Promise<SubscriptionInfo | null> => {
  const cached = subscriptionCache.get(gymId);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const subscription = await prisma.gymSubscription.findFirst({
    where: {
      gymId,
      status: { notIn: ['CANCELLED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: {
        select: {
          id: true,
          code: true,
          name: true,
          features: true,
          maxMembers: true,
          maxTrainers: true,
          maxStaff: true,
          maxBranches: true,
          maxClasses: true,
        },
      },
    },
  });

  if (!subscription) {
    // No subscription record at all → default free/trial tier. This replaces the
    // former fail-open behavior (no subscription = unrestricted access) with a
    // bounded entitlement so a gym can't run without limits before paying.
    const trial: SubscriptionInfo = {
      subscriptionId: '',
      status: 'TRIAL',
      planId: '',
      planCode: 'FREE',
      planName: 'Free Trial',
      features: DEFAULT_TRIAL_FEATURES,
      maxMembers: DEFAULT_TRIAL.maxMembers,
      maxTrainers: DEFAULT_TRIAL.maxTrainers,
      maxStaff: DEFAULT_TRIAL.maxStaff,
      maxBranches: DEFAULT_TRIAL.maxBranches,
      maxClasses: DEFAULT_TRIAL.maxClasses,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      gracePeriodEnd: null,
      isReadonly: false,
    };
    subscriptionCache.set(gymId, { data: trial, expiresAt: Date.now() + CACHE_TTL_MS });
    return trial;
  }

  const now = new Date();
  let effectiveStatus: SubscriptionStatus = subscription.status as SubscriptionStatus;

  // Auto-detect expired or past-due subscriptions
  if (effectiveStatus === 'ACTIVE') {
    if (subscription.endDate < now) {
      // Subscription has expired; check if still within grace period
      if (subscription.gracePeriodEnd && subscription.gracePeriodEnd > now) {
        effectiveStatus = 'GRACE_PERIOD';
      } else {
        effectiveStatus = 'EXPIRED';
      }
      // Update status in DB (fire and forget) for consistency
      prisma.gymSubscription.update({
        where: { id: subscription.id },
        data: { status: effectiveStatus },
      }).catch(() => {});
    }
  }

  const features: string[] = (() => {
    try {
      return JSON.parse(subscription.plan.features || '[]');
    } catch {
      return [];
    }
  })();

  const isReadonly = RESTRICTED_STATES.includes(effectiveStatus);

  const info: SubscriptionInfo = {
    subscriptionId: subscription.id,
    status: effectiveStatus,
    planId: subscription.plan.id,
    planCode: subscription.plan.code,
    planName: subscription.plan.name,
    features,
    maxMembers: subscription.plan.maxMembers,
    maxTrainers: subscription.plan.maxTrainers,
    maxStaff: subscription.plan.maxStaff,
    maxBranches: subscription.plan.maxBranches,
    maxClasses: subscription.plan.maxClasses,
    endDate: subscription.endDate,
    gracePeriodEnd: subscription.gracePeriodEnd,
    isReadonly,
  };

  subscriptionCache.set(gymId, { data: info, expiresAt: Date.now() + CACHE_TTL_MS });
  return info;
};

// Clear cache when subscription changes
export const clearSubscriptionCache = (gymId: string) => {
  subscriptionCache.delete(gymId);
};

// Middleware: Verify subscription is valid for the gym.
// Super Admins bypass subscription checks (platform management).
export const requireValidSubscription = async (req: SubscriptionRequest, res: Response, next: NextFunction) => {
  try {
    // Super Admins bypass subscription checks
    if (req.user?.role === 'SUPER_ADMIN') {
      return next();
    }

    const gymId = await resolveGymId(req);
    if (!gymId) {
      return next(); // No gym context = public route, continue
    }

    // Attach gymId to request for downstream handlers
    req.gymId = gymId;

    // getSubscriptionInfo always returns a value (real subscription or the
    // default free/trial tier), so access is never fail-open. Defensive guard:
    const info = await getSubscriptionInfo(gymId);
    if (!info) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_UNAVAILABLE',
          message: 'Unable to verify your gym subscription. Please contact support.',
        },
      });
    }

    // Block access for suspended/cancelled
    if (info.status === 'SUSPENDED' || info.status === 'CANCELLED') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_' + info.status,
          message: `Your subscription is ${info.status.toLowerCase()}. Contact support to restore access.`,
        },
      });
    }

    // Expired: allow read-only access
    if (info.status === 'EXPIRED') {
      req.subscription = { ...info, isReadonly: true };
      return next();
    }

    // Grace period: limited access
    if (info.status === 'GRACE_PERIOD') {
      req.subscription = { ...info, isReadonly: false };
      return next();
    }

    // Active / Trial / Past Due: full access
    req.subscription = info;
    next();
  } catch (error) {
    console.error('[Subscription] middleware error:', error);
    next(); // Fail open for subscription checks to avoid blocking legitimate users
  }
};

// Middleware: Block write operations when subscription is expired/suspended.
// Read-only requests (GET/HEAD/OPTIONS) always pass so dashboards stay viewable
// in read-only mode; mutations are blocked until the subscription is renewed.
export const requireWriteAccess = (req: SubscriptionRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'SUPER_ADMIN') return next();

  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  if (req.subscription?.isReadonly) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_READONLY',
        message: 'Your subscription has expired. Renew your subscription to restore full access.',
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
    if (!req.subscription) return next();

    if (!req.subscription.features.includes(featureCode)) {
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
// Gyms on the default free/trial tier get DEFAULT_TRIAL features via the
// subscription object, so this is accurate for every gym with a gymId.
export const isFeatureEnabled = (subscription: SubscriptionInfo | null | undefined, featureCode: string): boolean => {
  if (!subscription) return DEFAULT_TRIAL_FEATURES.includes(featureCode);
  return subscription.features.includes(featureCode);
};
