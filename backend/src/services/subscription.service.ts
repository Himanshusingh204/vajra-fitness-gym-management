import { prisma } from '../utils/prisma';
import { createNotification, notifyGymOwner } from './notification.service';
import { logAudit } from '../utils/audit';
import { clearSubscriptionCache } from '../middlewares/subscription.middleware';
import { DAY_MS, GRACE_PERIOD_DAYS, getGraceEnd } from './entitlements.service';

export { DAY_MS, GRACE_PERIOD_DAYS };
export const TRIAL_DAYS = 14;
const TRIAL_PLAN_CODE = 'PROFESSIONAL';

// ========================================
// SUBSCRIPTION LIFECYCLE MANAGEMENT
// ========================================
// Functions: activateSubscription, startAutomaticTrial, processExpiredSubscriptions, extendSubscription, cancelSubscription, upgradeSubscription, downgradeSubscription, generateSaaSInvoice

/**
 * Activate a pending subscription after payment verification.
 * Updates subscription status to ACTIVE, approves the gym, re-activates the owner, creates notification, and logs audit.
 */
// activateSubscription — activates pending subscription after verified payment
export const activateSubscription = async (subscriptionId: string) => {
  const sub = await prisma.gymSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: { select: { name: true } }, gym: { select: { id: true, ownerId: true, name: true } } },
  });
  if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
  if (sub.status === 'ACTIVE') return { alreadyActive: true };

  const updated = await prisma.gymSubscription.update({
    where: { id: subscriptionId },
    data: { status: 'ACTIVE', paidAt: new Date() },
  });

  // Ensure gym is approved when subscription is activated
  await prisma.gym.update({
    where: { id: sub.gymId },
    data: { isApproved: true },
  });

  // Re-activate gym owner if they were suspended
  await prisma.user.update({
    where: { id: sub.gym.ownerId },
    data: { isActive: true },
  });

  await createNotification({
    userId: sub.gym.ownerId,
    type: 'SUCCESS',
    title: 'Subscription activated',
    message: `Your ${sub.plan.name} subscription is now active until ${sub.endDate.toLocaleDateString('en-IN')}.`,
    link: '/admin/gym',
  });

  await logAudit({
    action: 'SUBSCRIPTION_ACTIVATED',
    entity: 'GymSubscription',
    entityId: subscriptionId,
    details: JSON.stringify({ gymId: sub.gymId, planName: sub.plan.name }),
    userId: null,
  });

  clearSubscriptionCache(sub.gymId);
  return { alreadyActive: false, subscription: updated };
};

// Every new gym gets one trial on Professional, started at signup. It does not
// approve the gym: Super Admin approval still gates the public directory.
export const startAutomaticTrial = async (gymId: string): Promise<void> => {
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { ownerId: true } });
  if (!gym) return;

  const existing = await prisma.gymSubscription.count({ where: { gymId } });
  if (existing > 0) return;

  const plan = await prisma.saaSPlan.findFirst({
    where: { OR: [{ code: TRIAL_PLAN_CODE }, { name: 'Professional' }] },
  });
  if (!plan) {
    console.error(`[subscription] trial plan ${TRIAL_PLAN_CODE} not found, gym ${gymId} starts without a trial`);
    return;
  }

  const start = new Date();
  const end = new Date(start.getTime() + TRIAL_DAYS * DAY_MS);

  const subscription = await prisma.gymSubscription.create({
    data: {
      gymId,
      planId: plan.id,
      status: 'TRIAL',
      startDate: start,
      endDate: end,
      amount: 0,
      billingCycle: 'MONTHLY',
      trialEndsAt: end,
    },
  });

  await createNotification({
    userId: gym.ownerId,
    type: 'SUCCESS',
    title: 'Free trial started',
    message: `Your ${TRIAL_DAYS}-day free trial of ${plan.name} has started.`,
    link: '/subscription',
  });

  await logAudit({
    action: 'SUBSCRIPTION_TRIAL_STARTED',
    entity: 'GymSubscription',
    entityId: subscription.id,
    details: JSON.stringify({ gymId, planId: plan.id, trialDays: TRIAL_DAYS }),
    userId: null,
  });

  clearSubscriptionCache(gymId);
};

// Notifies a gym owner at most once a day per title, so hourly runs do not
// repeat the same warning.
const notifyOncePerDay = async (userId: string, title: string, message: string) => {
  const recent = await prisma.notification.findFirst({
    where: { userId, title, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
    select: { id: true },
  });
  if (recent) return false;
  await createNotification({ userId, type: 'WARNING', title, message, link: '/subscription' });
  return true;
};

// Scheduler job. Access is already decided live from the dates (see
// getEffectiveStatus), so this only keeps stored statuses in step and sends
// reminders. Grace is GRACE_PERIOD_DAYS after the end date unless set.
export const processExpiredSubscriptions = async () => {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - GRACE_PERIOD_DAYS * DAY_MS);

  const intoGrace = await prisma.$transaction([
    prisma.gymSubscription.updateMany({
      where: { status: 'ACTIVE', endDate: { lt: now, gte: graceCutoff } },
      data: { status: 'GRACE_PERIOD' },
    }),
    prisma.gymSubscription.updateMany({
      where: { status: 'TRIAL', trialEndsAt: { lt: now, gte: graceCutoff } },
      data: { status: 'GRACE_PERIOD' },
    }),
  ]);

  const expired = await prisma.$transaction([
    prisma.gymSubscription.updateMany({
      where: { status: 'ACTIVE', endDate: { lt: graceCutoff } },
      data: { status: 'EXPIRED' },
    }),
    prisma.gymSubscription.updateMany({
      where: { status: 'TRIAL', trialEndsAt: { lt: graceCutoff } },
      data: { status: 'EXPIRED' },
    }),
    prisma.gymSubscription.updateMany({
      where: {
        status: 'GRACE_PERIOD',
        OR: [{ gracePeriodEnd: { lt: now } }, { gracePeriodEnd: null, endDate: { lt: graceCutoff } }],
      },
      data: { status: 'EXPIRED' },
    }),
  ]);

  const expiringTrials = await prisma.gymSubscription.findMany({
    where: { status: 'TRIAL', trialEndsAt: { gte: now, lte: new Date(now.getTime() + 2 * DAY_MS) } },
    include: { plan: { select: { name: true } }, gym: { select: { ownerId: true } } },
  });

  let trialExpiryNotifications = 0;
  for (const sub of expiringTrials) {
    const daysLeft = Math.max(1, Math.ceil((sub.trialEndsAt!.getTime() - now.getTime()) / DAY_MS));
    const sent = await notifyOncePerDay(
      sub.gym.ownerId,
      'Trial expiring soon',
      `Your ${sub.plan.name} free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Choose a plan to keep full access.`,
    );
    if (sent) trialExpiryNotifications += 1;
  }

  const inGrace = await prisma.gymSubscription.findMany({
    where: { status: 'GRACE_PERIOD' },
    include: { gym: { select: { ownerId: true } } },
  });

  let gracePeriodNotifications = 0;
  for (const sub of inGrace) {
    const daysLeft = Math.max(1, Math.ceil((getGraceEnd(sub).getTime() - now.getTime()) / DAY_MS));
    const sent = await notifyOncePerDay(
      sub.gym.ownerId,
      'Grace period active',
      `Your plan has ended. Renew within ${daysLeft} day${daysLeft === 1 ? '' : 's'} or your gym becomes read-only.`,
    );
    if (sent) gracePeriodNotifications += 1;
  }

  return {
    expired: expired.reduce((n, r) => n + r.count, 0),
    gracePeriod: intoGrace.reduce((n, r) => n + r.count, 0),
    trialExpiryNotifications,
    gracePeriodNotifications,
  };
};

// Extend a subscription (Super Admin action).
export const extendSubscription = async (subscriptionId: string, days: number, adminId: string) => {
  const sub = await prisma.gymSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: { select: { name: true } }, gym: { select: { ownerId: true } } },
  });
  if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');

  const newEnd = new Date(sub.endDate.getTime() + days * DAY_MS);
  const updated = await prisma.gymSubscription.update({
    where: { id: subscriptionId },
    data: { endDate: newEnd, status: 'ACTIVE', gracePeriodEnd: null },
  });

  await createNotification({
    userId: sub.gym.ownerId,
    type: 'SUCCESS',
    title: 'Subscription extended',
    message: `Your ${sub.plan.name} subscription has been extended by ${days} days until ${newEnd.toLocaleDateString('en-IN')}.`,
    link: '/admin/gym',
  });

  await logAudit({
    action: 'SUBSCRIPTION_EXTENDED',
    entity: 'GymSubscription',
    entityId: subscriptionId,
    details: JSON.stringify({ days, newEnd: newEnd.toISOString() }),
    userId: adminId,
  });

  clearSubscriptionCache(sub.gymId);
  return updated;
};

// Cancel a subscription.
export const cancelSubscription = async (subscriptionId: string, reason: string, userId: string) => {
  const sub = await prisma.gymSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: { select: { name: true } }, gym: { select: { ownerId: true } } },
  });
  if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');

  const updated = await prisma.gymSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason || null,
    },
  });

  await createNotification({
    userId: sub.gym.ownerId,
    type: 'WARNING',
    title: 'Subscription cancelled',
    message: `Your ${sub.plan.name} subscription has been cancelled. Choose a plan to keep full access to your gym.`,
    link: '/subscription',
  });

  await logAudit({
    action: 'SUBSCRIPTION_CANCELLED',
    entity: 'GymSubscription',
    entityId: subscriptionId,
    details: JSON.stringify({ reason }),
    userId,
  });

  clearSubscriptionCache(sub.gymId);
  return updated;
};

// upgradeSubscription — upgrades gym to new SaaS plan, cancels current, creates new ACTIVE subscription
export const upgradeSubscription = async (gymId: string, newPlanId: string, userId: string) => {
  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!gym) throw new Error('GYM_NOT_FOUND');

  const currentSub = await prisma.gymSubscription.findFirst({
    where: { gymId, status: { in: ['ACTIVE', 'TRIAL'] } },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  const newPlan = await prisma.saaSPlan.findUnique({ where: { id: newPlanId } });
  if (!newPlan) throw new Error('PLAN_NOT_FOUND');

  // Cancel current subscription
  if (currentSub) {
    await prisma.gymSubscription.update({
      where: { id: currentSub.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Upgraded to ' + newPlan.name },
    });
  }

  // Create new subscription
  const start = new Date();
  const months = 1; // Default to monthly
  const end = new Date(start.getTime() + months * 30 * DAY_MS);

  const subscription = await prisma.gymSubscription.create({
    data: {
      gymId,
      planId: newPlanId,
      status: 'ACTIVE',
      startDate: start,
      endDate: end,
      amount: newPlan.monthlyPrice,
      billingCycle: 'MONTHLY',
    },
    include: { plan: { select: { name: true } } },
  });

  await createNotification({
    userId: gym.ownerId,
    type: 'SUCCESS',
    title: 'Plan upgraded',
    message: `Your plan has been upgraded to ${newPlan.name}. Enjoy the new features!`,
    link: '/admin/gym',
  });

  await logAudit({
    action: 'SUBSCRIPTION_UPGRADED',
    entity: 'GymSubscription',
    entityId: subscription.id,
    details: JSON.stringify({ gymId, oldPlan: currentSub?.plan.code, newPlan: newPlan.code }),
    userId,
  });

  clearSubscriptionCache(gymId);
  return subscription;
};

// downgradeSubscription — changes gym to lower plan; preserves existing data, restricts new creation by new limits
export const downgradeSubscription = async (gymId: string, newPlanId: string, userId: string) => {
  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!gym) throw new Error('GYM_NOT_FOUND');

  const currentSub = await prisma.gymSubscription.findFirst({
    where: { gymId, status: { in: ['ACTIVE', 'TRIAL'] } },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  const newPlan = await prisma.saaSPlan.findUnique({ where: { id: newPlanId } });
  if (!newPlan) throw new Error('PLAN_NOT_FOUND');

  if (currentSub) {
    await prisma.gymSubscription.update({
      where: { id: currentSub.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Downgraded to ' + newPlan.name },
    });
  }

  const start = new Date();
  const end = new Date(start.getTime() + 30 * DAY_MS);

  const subscription = await prisma.gymSubscription.create({
    data: {
      gymId,
      planId: newPlanId,
      status: 'ACTIVE',
      startDate: start,
      endDate: end,
      amount: newPlan.monthlyPrice,
      billingCycle: 'MONTHLY',
    },
    include: { plan: { select: { name: true } } },
  });

  await createNotification({
    userId: gym.ownerId,
    type: 'INFO',
    title: 'Plan downgraded',
    message: `Your plan has been changed to ${newPlan.name}. Existing data is preserved but new creation is restricted by the plan's limits.`,
    link: '/admin/gym',
  });

  await logAudit({
    action: 'SUBSCRIPTION_DOWNGRADED',
    entity: 'GymSubscription',
    entityId: subscription.id,
    details: JSON.stringify({ gymId, oldPlan: currentSub?.plan.code, newPlan: newPlan.code }),
    userId,
  });

  clearSubscriptionCache(gymId);
  return subscription;
};

// generateSaaSInvoice — creates SubscriptionInvoice with GST breakdown (CGST, SGST, IGST) and unique invoice number
export const generateSaaSInvoice = async (subscriptionId: string) => {
  const sub = await prisma.gymSubscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: { select: { name: true } },
      gym: { select: { id: true, name: true, gstNumber: true, address: true, city: true, state: true, ownerId: true } },
    },
  });
  if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');

  const gymOwner = await prisma.user.findUnique({
    where: { id: sub.gym.ownerId },
    select: { username: true, email: true },
  });

  // Generate unique invoice number
  const timestamp = Date.now().toString(36).toUpperCase();
  const invoiceNumber = `INV-${sub.gymId.slice(0, 4).toUpperCase()}-${timestamp}`;

  const subtotal = sub.amount.toNumber();
  const taxRate = 18; // GST rate in India
  const isInterstate = false; // Simplified: assume intrastate
  const taxAmount = (subtotal * taxRate) / 100;
  const cgst = isInterstate ? 0 : taxAmount / 2;
  const sgst = isInterstate ? 0 : taxAmount / 2;
  const igst = isInterstate ? taxAmount : 0;
  const total = subtotal + taxAmount;

  const billingPeriod = `${sub.startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;

  const invoice = await prisma.subscriptionInvoice.create({
    data: {
      invoiceNumber,
      gymName: sub.gym.name,
      ownerName: gymOwner?.username ?? 'Unknown',
      billingAddress: sub.gym.address,
      gstin: sub.gym.gstNumber,
      planName: sub.plan.name,
      billingPeriod,
      subtotal,
      taxRate,
      taxAmount,
      cgst,
      sgst,
      igst,
      discount: 0,
      total,
      status: sub.status === 'ACTIVE' ? 'PAID' : 'PENDING',
      paymentMethod: sub.paymentMethod,
      transactionId: sub.razorpayPaymentId,
      dueDate: sub.endDate,
      gymId: sub.gymId,
      subscriptionId: sub.id,
    },
  });

  return invoice;
};
