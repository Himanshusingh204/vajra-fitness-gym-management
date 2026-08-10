import { prisma } from '../utils/prisma';
import { createNotification } from '../services/notification.service';
import { syncExpiredMemberships, EXPIRING_SOON_DAYS, DAY_MS } from '../services/membership.service';
import { processExpiredSubscriptions } from '../services/subscription.service';
import { backgroundJobsRun, backgroundJobsErrors } from '../utils/metrics';

export const JOB_INTERVAL_MS = 60 * 60 * 1000; // run hourly

// Marks ACTIVE memberships whose end date has passed as EXPIRED.
export const runExpirySync = async () => {
  return syncExpiredMemberships();
};

// Nudges members whose ACTIVE membership expires within EXPIRING_SOON_DAYS.
export const runExpiryReminders = async () => {
  const soon = new Date(Date.now() + EXPIRING_SOON_DAYS * DAY_MS);
  const now = new Date();

  const memberships = await prisma.membership.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { gte: now, lte: soon },
      expiryReminderSentAt: null,
    },
    include: {
      member: { include: { user: { select: { id: true, username: true } } } },
      plan: { select: { name: true } },
    },
    take: 200,
  });

  for (const membership of memberships) {
    const daysLeft = Math.max(1, Math.ceil((membership.endDate.getTime() - Date.now()) / DAY_MS));
    await createNotification({
      userId: membership.member.userId,
      type: 'WARNING',
      title: 'Membership expiring soon',
      message: `Your ${membership.plan?.name ?? 'membership'} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} on ${membership.endDate.toLocaleDateString('en-IN')}. Renew to stay active.`,
      link: '/dashboard',
    });
    await prisma.membership.update({
      where: { id: membership.id },
      data: { expiryReminderSentAt: new Date() },
    });
  }

  return memberships.length;
};

// Nudges members about PENDING / OVERDUE fees within the next 3 days.
export const runFeeReminders = async () => {
  const horizon = new Date(Date.now() + 3 * DAY_MS);

  const fees = await prisma.fee.findMany({
    where: {
      status: { in: ['PENDING', 'OVERDUE'] },
      dueDate: { lte: horizon },
      reminderSentAt: null,
    },
    include: {
      member: {
        include: { user: { select: { id: true, username: true } } },
      },
      gym: { select: { name: true } },
    },
    take: 200,
  });

  for (const fee of fees) {
    const overdue = fee.dueDate.getTime() < Date.now();
    await createNotification({
      userId: fee.member.userId,
      type: 'WARNING',
      title: overdue ? 'Payment overdue' : 'Payment due soon',
      message: `A payment of ₹${fee.amount.toNumber().toLocaleString('en-IN')} for ${fee.gym.name} was due on ${fee.dueDate.toLocaleDateString('en-IN')}. Please clear it to continue uninterrupted.`,
      link: '/dashboard',
    });
    await prisma.fee.update({
      where: { id: fee.id },
      data: { reminderSentAt: new Date() },
    });
  }

  return fees.length;
};

// Process SaaS subscription lifecycle: expired subs, grace periods, trial expiry notifications.
export const runSubscriptionLifecycle = async () => {
  return processExpiredSubscriptions();
};

// ---- Payment retry / failed-payment handling (Phase 1.6) ----

const PAYMENT_ORDER_STALE_MS = 48 * DAY_MS;

// 1. Fail Razorpay orders that were created but never completed, and notify the
//    member (once, on the actual CREATED -> FAILED transition).
// 2. Escalate PENDING fees past their due date to OVERDUE.
export const runPaymentReconciliation = async () => {
  const staleCutoff = new Date(Date.now() - PAYMENT_ORDER_STALE_MS);

  const staleOrders = await prisma.paymentOrder.findMany({
    where: { status: 'CREATED', createdAt: { lt: staleCutoff } },
    include: { fee: { include: { member: { include: { user: { select: { id: true } } } } } } },
    take: 200,
  });

  let failedOrders = 0;
  for (const order of staleOrders) {
    const claimed = await prisma.paymentOrder.updateMany({
      where: { id: order.id, status: 'CREATED' },
      data: { status: 'FAILED' },
    });
    if (claimed.count === 1) {
      failedOrders += 1;
      await createNotification({
        userId: order.fee.member.user.id,
        type: 'WARNING',
        title: 'Payment attempt expired',
        message: 'Your recent payment attempt expired before completion. Please retry it to keep your membership uninterrupted.',
        link: '/dashboard',
      });
    }
  }

  const escalated = await prisma.fee.updateMany({
    where: { status: 'PENDING', dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  });

  return { failedOrders, escalatedFees: escalated.count };
};

// ---- Subscription dunning (Phase 1.7) ----

const DUNNING_FIRST_REMINDER_MS = 24 * DAY_MS;
const DUNNING_ESCALATION_MS = 72 * DAY_MS;

// PENDING SaaS subscriptions whose Razorpay order was created but never paid
// get a gentle reminder after 24h and escalate to PAST_DUE after 72h (status
// transitions are idempotent, so escalation fires exactly once).
export const runSubscriptionDunning = async () => {
  const now = Date.now();
  const firstReminderCutoff = new Date(now - DUNNING_FIRST_REMINDER_MS);
  const escalationCutoff = new Date(now - DUNNING_ESCALATION_MS);

  const pending = await prisma.gymSubscription.findMany({
    where: { status: 'PENDING', razorpayOrderId: { not: null }, razorpayPaymentId: null },
    include: { gym: { select: { ownerId: true, name: true } }, plan: { select: { name: true } } },
    take: 200,
  });

  let reminders = 0;
  let escalated = 0;

  for (const sub of pending) {
    const lastActionAt = sub.updatedAt.getTime();

    if (lastActionAt < escalationCutoff.getTime()) {
      const claimed = await prisma.gymSubscription.updateMany({
        where: { id: sub.id, status: 'PENDING' },
        data: { status: 'PAST_DUE' },
      });
      if (claimed.count === 1) {
        escalated += 1;
        await createNotification({
          userId: sub.gym.ownerId,
          type: 'ERROR',
          title: 'Subscription payment overdue',
          message: `Your ${sub.plan.name} subscription payment for ${sub.gym.name} is overdue. Complete it to avoid service restriction.`,
          link: '/admin/gym',
        });
      }
    } else if (lastActionAt < firstReminderCutoff.getTime()) {
      // Dedupe: only one gentle reminder per rolling week.
      const already = await prisma.notification.findFirst({
        where: { userId: sub.gym.ownerId, title: 'Subscription payment pending', createdAt: { gte: new Date(now - 7 * DAY_MS) } },
      });
      if (already) continue;
      reminders += 1;
      await createNotification({
        userId: sub.gym.ownerId,
        type: 'WARNING',
        title: 'Subscription payment pending',
        message: `Your ${sub.plan.name} subscription payment for ${sub.gym.name} is still pending. Please complete it soon.`,
        link: '/admin/gym',
      });
    }
  }

  return { dunningReminders: reminders, escalatedToPastDue: escalated };
};

const runTracked = async <T>(job: string, fn: () => Promise<T>): Promise<T> => {
  try {
    const result = await fn();
    backgroundJobsRun.inc({ job });
    return result;
  } catch (err) {
    backgroundJobsErrors.inc({ job });
    throw err;
  }
};

// Runs every background job. Safe to call repeatedly (idempotent).
export const runAllJobs = async () => {
  const [expired, expiryNudges, feeNudges, subscriptionLifecycle, paymentReconciliation, dunning] = await Promise.all([
    runTracked('expirySync', runExpirySync),
    runTracked('expiryReminders', runExpiryReminders),
    runTracked('feeReminders', runFeeReminders),
    runTracked('subscriptionLifecycle', runSubscriptionLifecycle),
    runTracked('paymentReconciliation', runPaymentReconciliation),
    runTracked('subscriptionDunning', runSubscriptionDunning),
  ]);
  return { expired, expiryNudges, feeNudges, subscriptionLifecycle, paymentReconciliation, dunning };
};
