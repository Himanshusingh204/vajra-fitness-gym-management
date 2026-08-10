import { prisma } from '../utils/prisma';

// Centralized SaaS entitlement checks. A gym with an ACTIVE subscription is
// bounded by the plan's limits (maxMembers / maxTrainers / maxStaff).
// Gyms WITHOUT an active subscription are bounded by a default free/trial tier
// (DEFAULT_TRIAL) instead of being unrestricted — closing the former fail-open
// behavior where a gym could operate without limits forever without paying.

type LimitField = 'maxMembers' | 'maxTrainers' | 'maxStaff' | 'maxBranches' | 'maxClasses';

const LIMIT_LABELS: Record<LimitField, string> = {
  maxMembers: 'member',
  maxTrainers: 'trainer',
  maxStaff: 'staff',
  maxBranches: 'branch',
  maxClasses: 'class',
};

// Default entitlement applied when a gym has no active subscription.
export const DEFAULT_TRIAL = {
  maxMembers: 25,
  maxTrainers: 5,
  maxStaff: 5,
  maxBranches: 1,
  maxClasses: 5,
  features: [
    'MEMBER_MANAGEMENT',
    'ATTENDANCE',
    'MEMBERSHIPS',
    'PAYMENTS',
    'BASIC_REPORTS',
    'WORKOUT_PLANS',
  ],
} as const;

export const DEFAULT_TRIAL_FEATURES: string[] = [...DEFAULT_TRIAL.features];

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

// Returns the limits that would be exceeded, or [] when creation is allowed.
export const getExceededLimits = async (
  gymId: string,
  opts: { addMembers?: number; addTrainers?: number; addStaff?: number; addBranches?: number; addClasses?: number } = {},
): Promise<string[]> => {
  const sub = await prisma.gymSubscription.findFirst({
    where: { gymId, status: { in: ['ACTIVE', 'TRIAL'] }, endDate: { gte: new Date() } },
    orderBy: { endDate: 'desc' },
    include: { plan: true },
  });
  // No active subscription → apply the default free/trial tier.
  const plan = sub?.plan ?? null;
  const limits: Record<LimitField, number> = {
    maxMembers: plan?.maxMembers ?? DEFAULT_TRIAL.maxMembers,
    maxTrainers: plan?.maxTrainers ?? DEFAULT_TRIAL.maxTrainers,
    maxStaff: plan?.maxStaff ?? DEFAULT_TRIAL.maxStaff,
    maxBranches: plan?.maxBranches ?? DEFAULT_TRIAL.maxBranches,
    maxClasses: plan?.maxClasses ?? DEFAULT_TRIAL.maxClasses,
  };
  const exceeded: string[] = [];

  const check = async (field: LimitField, countPromise: Promise<number>, add: number) => {
    const max = limits[field];
    if (max == null) return;
    const current = await countPromise;
    if (current + add > max) exceeded.push(LIMIT_LABELS[field]);
  };

  await Promise.all([
    check('maxMembers', prisma.memberDetails.count({ where: { gymId, status: { not: 'PENDING' } } }), opts.addMembers ?? 0),
    check('maxTrainers', prisma.trainerDetails.count({ where: { gymId } }), opts.addTrainers ?? 0),
    check('maxStaff', prisma.staffDetails.count({ where: { gymId } }), opts.addStaff ?? 0),
    check('maxBranches', prisma.branch.count({ where: { gymId, isActive: true } }), opts.addBranches ?? 0),
    check('maxClasses', prisma.gymClass.count({ where: { gymId, isActive: true } }), opts.addClasses ?? 0),
  ]);

  return exceeded;
};

// Throws a typed error the controller maps to a 402 (Payment Required).
export const assertGymCapacity = async (
  gymId: string,
  opts: { addMembers?: number; addTrainers?: number; addStaff?: number; addBranches?: number; addClasses?: number } = {},
) => {
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
  const sub = await prisma.gymSubscription.findFirst({
    where: { gymId, status: { in: ['ACTIVE', 'TRIAL'] }, endDate: { gte: new Date() } },
    orderBy: { endDate: 'desc' },
    include: { plan: true },
  });
  if (!sub || !sub.plan) return DEFAULT_TRIAL_FEATURES.includes(featureCode); // default free tier

  try {
    const features: string[] = JSON.parse(sub.plan.features || '[]');
    return features.includes(featureCode);
  } catch {
    return false;
  }
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

// Get full subscription summary for a gym (used in dashboard APIs).
export const getGymSubscriptionSummary = async (gymId: string) => {
  const sub = await prisma.gymSubscription.findFirst({
    where: { gymId, status: { notIn: ['CANCELLED'] } },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  if (!sub) {
    return {
      hasSubscription: false,
      status: 'TRIAL',
      plan: null,
      features: DEFAULT_TRIAL_FEATURES,
      limits: {
        maxMembers: DEFAULT_TRIAL.maxMembers,
        maxTrainers: DEFAULT_TRIAL.maxTrainers,
        maxStaff: DEFAULT_TRIAL.maxStaff,
        maxBranches: DEFAULT_TRIAL.maxBranches,
        maxClasses: DEFAULT_TRIAL.maxClasses,
      },
      usage: { members: 0, trainers: 0, staff: 0, branches: 0, classes: 0 },
      isReadonly: false,
    };
  }

  const features: string[] = (() => {
    try { return JSON.parse(sub.plan.features || '[]'); } catch { return []; }
  })();

  const now = new Date();
  let effectiveStatus = sub.status;
  if (effectiveStatus === 'ACTIVE' && sub.endDate < now) {
    effectiveStatus = sub.gracePeriodEnd && sub.gracePeriodEnd > now ? 'GRACE_PERIOD' : 'EXPIRED';
  }

  const [memberCount, trainerCount, staffCount, branchCount, classCount] = await Promise.all([
    prisma.memberDetails.count({ where: { gymId, status: { not: 'PENDING' } } }),
    prisma.trainerDetails.count({ where: { gymId } }),
    prisma.staffDetails.count({ where: { gymId } }),
    prisma.branch.count({ where: { gymId, isActive: true } }),
    prisma.gymClass.count({ where: { gymId, isActive: true } }),
  ]);

  return {
    hasSubscription: true,
    subscriptionId: sub.id,
    status: effectiveStatus,
    plan: {
      id: sub.plan.id,
      name: sub.plan.name,
      code: sub.plan.code,
    },
    features,
    limits: {
      maxMembers: sub.plan.maxMembers,
      maxTrainers: sub.plan.maxTrainers,
      maxStaff: sub.plan.maxStaff,
      maxBranches: sub.plan.maxBranches,
      maxClasses: sub.plan.maxClasses,
    },
    usage: {
      members: memberCount,
      trainers: trainerCount,
      staff: staffCount,
      branches: branchCount,
      classes: classCount,
    },
    startDate: sub.startDate,
    endDate: sub.endDate,
    isReadonly: effectiveStatus === 'EXPIRED' || effectiveStatus === 'SUSPENDED',
  };
};
