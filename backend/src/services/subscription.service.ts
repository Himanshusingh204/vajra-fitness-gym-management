import { prisma } from '../utils/prisma';
import { createNotification, notifyGymOwner } from './notification.service';
import { logAudit } from '../utils/audit';
import { clearSubscriptionCache } from '../middlewares/subscription.middleware';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const GRACE_PERIOD_DAYS = 3; // Default grace period

// ========================================
// SUBSCRIPTION LIFECYCLE MANAGEMENT
// ========================================
// Functions: activateSubscription, startTrial, processExpiredSubscriptions, extendSubscription, cancelSubscription, upgradeSubscription, downgradeSubscription, generateSaaSInvoice

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

// Start a trial subscription (7 or 14 days free).
export const startTrial = async (gymId: string, planId: string, trialDays: number = 7) => {
  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!gym) throw new Error('GYM_NOT_FOUND');

  const plan = await prisma.saaSPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error('PLAN_NOT_FOUND');

  const start = new Date();
  const end = new Date(start.getTime() + trialDays * DAY_MS);
  const trialEnds = new Date(end.getTime());

  const subscription = await prisma.gymSubscription.create({
    data: {
      gymId,
      planId,
      status: 'TRIAL',
      startDate: start,
      endDate: end,
      amount: 0,
      billingCycle: 'MONTHLY',
      trialEndsAt: trialEnds,
    },
    include: { plan: { select: { name: true } } },
  });

  await prisma.gym.update({ where: { id: gymId }, data: { isApproved: true } });
  await prisma.user.update({ where: { id: gym.ownerId }, data: { isActive: true } });

  await createNotification({
    userId: gym.ownerId,
    type: 'SUCCESS',
    title: 'Free trial started',
    message: `Your ${trialDays}-day free trial of ${plan.name} has started. Explore all features before subscribing.`,
    link: '/admin/gym',
  });

  await logAudit({
    action: 'SUBSCRIPTION_TRIAL_STARTED',
    entity: 'GymSubscription',
    entityId: subscription.id,
    details: JSON.stringify({ gymId, planId, trialDays }),
    userId: null,
  });

  clearSubscriptionCache(gymId);
  return subscription;
};

// processExpiredSubscriptions — hourly scheduler job: expires overdue subscriptions, sets grace periods, sends notifications
export const processExpiredSubscriptions = async () => {
  const now = new Date();

  // 1. ACTIVE -> EXPIRED (end date passed)
  const expired = await prisma.gymSubscription.updateMany({
    where: { status: 'ACTIVE', endDate: { lt: now } },
    data: { status: 'EXPIRED' },
  });

  // 2. TRIAL -> EXPIRED (trial end date passed)
  const expiredTrials = await prisma.gymSubscription.updateMany({
    where: { status: 'TRIAL', trialEndsAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });

  // 3. EXPIRED -> GRACE_PERIOD (within grace period window)
  const graceDeadline = new Date(now.getTime() + GRACE_PERIOD_DAYS * DAY_MS);
  const gracePeriodSubs = await prisma.gymSubscription.updateMany({
    where: {
      status: 'EXPIRED',
      gracePeriodEnd: null,
      endDate: { gte: new Date(now.getTime() - GRACE_PERIOD_DAYS * DAY_MS) },
    },
    data: { gracePeriodEnd: graceDeadline, status: 'GRACE_PERIOD' },
  });

  // 4. Send notifications for expiring trials
  const expiringTrials = await prisma.gymSubscription.findMany({
    where: {
      status: 'TRIAL',
      trialEndsAt: {
        gte: now,
        lte: new Date(now.getTime() + 2 * DAY_MS),
      },
    },
    include: { plan: { select: { name: true } }, gym: { select: { ownerId: true } } },
  });

  for (const sub of expiringTrials) {
    const daysLeft = Math.max(1, Math.ceil((sub.trialEndsAt!.getTime() - now.getTime()) / DAY_MS));
    await createNotification({
      userId: sub.gym.ownerId,
      type: 'WARNING',
      title: 'Trial expiring soon',
      message: `Your ${sub.plan.name} free trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Subscribe now to keep full access.`,
      link: '/subscription',
    });
  }

  // 5. Send notifications for subscriptions entering grace period
  const gracePeriodActive = await prisma.gymSubscription.findMany({
    where: { status: 'GRACE_PERIOD', gracePeriodEnd: { gte: now } },
    include: { plan: { select: { name: true } }, gym: { select: { ownerId: true } } },
  });

  for (const sub of gracePeriodActive) {
    const daysLeft = Math.max(1, Math.ceil((sub.gracePeriodEnd!.getTime() - now.getTime()) / DAY_MS));
    await createNotification({
      userId: sub.gym.ownerId,
      type: 'WARNING',
      title: 'Grace period active',
      message: `Your subscription is in grace period. Renew within ${daysLeft} day${daysLeft === 1 ? '' : 's'} to avoid restricted access.`,
      link: '/subscription',
    });
  }

  return {
    expired: expired.count + expiredTrials.count,
    gracePeriod: gracePeriodSubs.count,
    trialExpiryNotifications: expiringTrials.length,
    gracePeriodNotifications: gracePeriodActive.length,
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
    message: `Your ${sub.plan.name} subscription has been cancelled. Access will continue until ${sub.endDate.toLocaleDateString('en-IN')}.`,
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
