import { prisma } from '../utils/prisma';

// SaaS entitlements. Every gym's access comes from its current subscription
// row. A gym with no usable row is read-only: there is no free tier.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const GRACE_PERIOD_DAYS = 3;

export type SubscriptionStatus = 'PENDING' | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';

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
  startDate: Date;
  endDate: Date;
  trialEndsAt: Date | null;
  gracePeriodEnd: Date | null;
  isReadonly: boolean;
}

type LimitField = 'maxMembers' | 'maxTrainers' | 'maxStaff' | 'maxBranches' | 'maxClasses';

const LIMIT_LABELS: Record<LimitField, string> = {
  maxMembers: 'member',
  maxTrainers: 'trainer',
  maxStaff: 'staff',
  maxBranches: 'branch',
  maxClasses: 'class',
};

// PENDING and PAST_DUE rows are checkouts that were never paid, and CANCELLED
// rows were replaced or ended, so none of them decide access.
const IGNORED_STATUSES = ['PENDING', 'PAST_DUE', 'CANCELLED'];

interface SubscriptionDates {
  status: string;
  endDate: Date;
  trialEndsAt: Date | null;
  gracePeriodEnd: Date | null;
}

// Works out the status from the dates, so trials and paid plans expire on time
// even when the scheduler has not run. Grace defaults to GRACE_PERIOD_DAYS
// after the end date when the scheduler never set gracePeriodEnd.
export const getEffectiveStatus = (sub: SubscriptionDates, now = new Date()): SubscriptionStatus => {
  const status = sub.status as SubscriptionStatus;
  if (status !== 'ACTIVE' && status !== 'TRIAL' && status !== 'GRACE_PERIOD') return status;

  const endsAt = status === 'TRIAL' ? sub.trialEndsAt ?? sub.endDate : sub.endDate;
  if (status !== 'GRACE_PERIOD' && endsAt > now) return status;

  const graceEnd = sub.gracePeriodEnd ?? new Date(endsAt.getTime() + GRACE_PERIOD_DAYS * DAY_MS);
  return graceEnd > now ? 'GRACE_PERIOD' : 'EXPIRED';
};

export const getGraceEnd = (sub: SubscriptionDates): Date => {
  const endsAt = sub.status === 'TRIAL' ? sub.trialEndsAt ?? sub.endDate : sub.endDate;
  return sub.gracePeriodEnd ?? new Date(endsAt.getTime() + GRACE_PERIOD_DAYS * DAY_MS);
};

const parseFeatures = (raw: string | null) => {
  try {
    return JSON.parse(raw || '[]') as string[];
  } catch {
    return [];
  }
};

const findCurrentSubscription = (gymId: string) =>
  prisma.gymSubscription.findFirst({
    where: { gymId, status: { notIn: IGNORED_STATUSES } },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

// Uncached. The subscription middleware caches this per gym.
export const loadSubscriptionInfo = async (gymId: string): Promise<SubscriptionInfo | null> => {
  const sub = await findCurrentSubscription(gymId);
  if (!sub) return null;

  const status = getEffectiveStatus(sub);
  if (status !== sub.status) {
    // Keep the stored status in step for Super Admin listings. Best-effort.
    prisma.gymSubscription.update({ where: { id: sub.id }, data: { status } }).catch(() => {});
  }

  return {
    subscriptionId: sub.id,
    status,
    planId: sub.plan.id,
    planCode: sub.plan.code,
    planName: sub.plan.name,
    features: parseFeatures(sub.plan.features),
    maxMembers: sub.plan.maxMembers,
    maxTrainers: sub.plan.maxTrainers,
    maxStaff: sub.plan.maxStaff,
    maxBranches: sub.plan.maxBranches,
    maxClasses: sub.plan.maxClasses,
    startDate: sub.startDate,
    endDate: sub.endDate,
    trialEndsAt: sub.trialEndsAt,
    gracePeriodEnd: status === 'GRACE_PERIOD' ? getGraceEnd(sub) : sub.gracePeriodEnd,
    isReadonly: status === 'EXPIRED' || status === 'SUSPENDED',
  };
};

// Feature codes used across the platform
export const FEATURE_CODES = {
  MEMBER_MANAGEMENT: 'MEMBER_MANAGEMENT',
  ATTENDANCE: 'ATTENDANCE',
  MEMBERSHIPS: 'MEMBERSHIPS',
  PAYMENTS: 'PAYMENTS',
  BASIC_REPORTS: 'BASIC_REPORTS',
  WORKOUT_PLANS: 'WORKOUT_PLANS',
  PT_MANAGEMENT: 'PT_MANAGEMENT',
  ADVANCED_REPORTS: 'ADVANCED_REPORTS',
  WHATSAPP_SMS: 'WHATSAPP_SMS',
  INVENTORY: 'INVENTORY',
  EXPENSES: 'EXPENSES',
  CLASSES: 'CLASSES',
  EQUIPMENT: 'EQUIPMENT',
  PAYROLL: 'PAYROLL',
  POS: 'POS',
  CRM: 'CRM',
  MULTI_BRANCH: 'MULTI_BRANCH',
  API_ACCESS: 'API_ACCESS',
  CUSTOM_BRANDING: 'CUSTOM_BRANDING',
  WHITE_LABEL: 'WHITE_LABEL',
  PRIORITY_SUPPORT: 'PRIORITY_SUPPORT',
} as const;

const countUsage = async (gymId: string) => {
  const [members, trainers, staff, branches, classes] = await Promise.all([
    prisma.memberDetails.count({ where: { gymId, status: { not: 'PENDING' } } }),
    prisma.trainerDetails.count({ where: { gymId } }),
    prisma.staffDetails.count({ where: { gymId } }),
    prisma.branch.count({ where: { gymId, isActive: true } }),
    prisma.gymClass.count({ where: { gymId, isActive: true } }),
  ]);
  return { members, trainers, staff, branches, classes };
};

type CapacityRequest = { addMembers?: number; addTrainers?: number; addStaff?: number; addBranches?: number; addClasses?: number };

// Returns the limits that would be exceeded, or [] when creation is allowed.
export const getExceededLimits = async (gymId: string, opts: CapacityRequest = {}): Promise<string[]> => {
  const adds: Record<LimitField, number> = {
    maxMembers: opts.addMembers ?? 0,
    maxTrainers: opts.addTrainers ?? 0,
    maxStaff: opts.addStaff ?? 0,
    maxBranches: opts.addBranches ?? 0,
    maxClasses: opts.addClasses ?? 0,
  };

  const info = await loadSubscriptionInfo(gymId);
  // Without a usable plan nothing new can be created.
  if (!info || info.isReadonly) {
    return (Object.keys(adds) as LimitField[]).filter((f) => adds[f] > 0).map((f) => LIMIT_LABELS[f]);
  }

  const usage = await countUsage(gymId);
  const current: Record<LimitField, number> = {
    maxMembers: usage.members,
    maxTrainers: usage.trainers,
    maxStaff: usage.staff,
    maxBranches: usage.branches,
    maxClasses: usage.classes,
  };

  return (Object.keys(adds) as LimitField[])
    .filter((f) => {
      const max = info[f];
      return max != null && current[f] + adds[f] > max;
    })
    .map((f) => LIMIT_LABELS[f]);
};

// Throws a typed error the controller maps to a 402 (Payment Required).
export const assertGymCapacity = async (gymId: string, opts: CapacityRequest = {}) => {
  const exceeded = await getExceededLimits(gymId, opts);
  if (exceeded.length === 0) return;
  const error = new Error(
    `LIMIT_EXCEEDED:${exceeded.join(',')}:Your ${exceeded.join(' and ')} limit${exceeded.length > 1 ? 's are' : ' is'} reached. Upgrade your plan to add more.`,
  );
  error.name = 'EntitlementError';
  throw error;
};

// Check if a specific feature is enabled for a gym's current plan.
export const isFeatureEnabled = async (gymId: string, featureCode: string): Promise<boolean> => {
  const info = await loadSubscriptionInfo(gymId);
  return !!info && !info.isReadonly && info.features.includes(featureCode);
};

// Assert a feature is enabled, or throw.
export const assertFeatureEnabled = async (gymId: string, featureCode: string) => {
  const enabled = await isFeatureEnabled(gymId, featureCode);
  if (!enabled) {
    const error = new Error(
      `FEATURE_NOT_ENTITLED:${featureCode}:The "${featureCode}" feature is not available in your current plan. Upgrade to access this feature.`,
    );
    error.name = 'EntitlementError';
    throw error;
  }
};

// Subscription summary for the gym admin dashboard. status is 'NONE' when the
// gym has no plan at all.
export const getGymSubscriptionSummary = async (gymId: string) => {
  const [info, usage, pending] = await Promise.all([
    loadSubscriptionInfo(gymId),
    countUsage(gymId),
    prisma.gymSubscription.count({ where: { gymId, status: { in: ['PENDING', 'PAST_DUE'] } } }),
  ]);

  if (!info) {
    return {
      hasSubscription: false,
      status: 'NONE',
      plan: null,
      features: [] as string[],
      limits: { maxMembers: 0, maxTrainers: 0, maxStaff: 0, maxBranches: 0, maxClasses: 0 },
      usage,
      hasPendingCheckout: pending > 0,
      isReadonly: true,
    };
  }

  return {
    hasSubscription: true,
    subscriptionId: info.subscriptionId,
    status: info.status,
    plan: { id: info.planId, name: info.planName, code: info.planCode },
    features: info.features,
    limits: {
      maxMembers: info.maxMembers,
      maxTrainers: info.maxTrainers,
      maxStaff: info.maxStaff,
      maxBranches: info.maxBranches,
      maxClasses: info.maxClasses,
    },
    usage,
    startDate: info.startDate,
    endDate: info.endDate,
    trialEndsAt: info.trialEndsAt,
    gracePeriodEnd: info.gracePeriodEnd,
    hasPendingCheckout: pending > 0,
    isReadonly: info.isReadonly,
  };
};
