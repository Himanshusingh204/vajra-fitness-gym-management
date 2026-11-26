import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { logAudit } from '../utils/audit';
import { getRazorpay, onlinePaymentsEnabled } from './payment.service';
import { DAY_MS } from './membership.service';
import { createNotification, notifyGymOwner } from './notification.service';

export const HOLD_DAYS = 7;
export const MIN_PAYOUT_PAISE = 50000;

// Route transfers move real money to gyms, so they need their own switch on top of the keys.
export const routePayoutsEnabled = () => onlinePaymentsEnabled() && process.env.RAZORPAY_ROUTE_ENABLED === 'true';

const BALANCE_ACCOUNTS = ['GYM_PAYABLE', 'PAYOUT', 'ADJUSTMENT'];

// Credits count once they are past the hold; debits (refunds, payouts) count at once.
// Transfers still in flight have no PAYOUT row yet, so they are taken off here.
export const availableForPayout = async (gymId: string, now = new Date(), db: Prisma.TransactionClient = prisma) => {
  const [ledger, inFlight] = await Promise.all([
    db.ledgerEntry.aggregate({
      where: {
        gymId,
        account: { in: BALANCE_ACCOUNTS },
        OR: [{ createdAt: { lte: new Date(now.getTime() - HOLD_DAYS * DAY_MS) } }, { amountPaise: { lt: 0 } }],
      },
      _sum: { amountPaise: true },
    }),
    db.payout.aggregate({ where: { gymId, status: 'PROCESSING' }, _sum: { amountPaise: true } }),
  ]);
  return (ledger._sum.amountPaise ?? 0) - (inFlight._sum.amountPaise ?? 0);
};

// Weekly job. One transfer per gym with an active linked account and at least
// the minimum available; a gym with a transfer still processing is skipped.
export const runPayouts = async (now = new Date()) => {
  if (!routePayoutsEnabled()) return { created: 0, failed: 0 };
  const rzp = getRazorpay();
  const accounts = await prisma.gymPayoutAccount.findMany({ where: { status: 'ACTIVE' } });

  let created = 0;
  let failed = 0;
  for (const account of accounts) {
    const payout = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payout:${account.gymId}`}))`;
      if (await tx.payout.count({ where: { gymId: account.gymId, status: 'PROCESSING' } })) return null;
      const amountPaise = await availableForPayout(account.gymId, now, tx);
      if (amountPaise < MIN_PAYOUT_PAISE) return null;
      return tx.payout.create({
        data: { gymId: account.gymId, amountPaise, periodEnd: new Date(now.getTime() - HOLD_DAYS * DAY_MS) },
      });
    });
    if (!payout) continue;
    created += 1;
    try {
      const transfer = await rzp.transfers.create({
        account: account.razorpayAccountId,
        amount: payout.amountPaise,
        currency: 'INR',
        notes: { payoutId: payout.id },
      });
      await prisma.payout.update({ where: { id: payout.id }, data: { razorpayTransferId: transfer.id } });
      if (transfer.status === 'processed') await markPayoutPaid(transfer.id);
    } catch (err) {
      // Provider exceptions can be ambiguous: leave PROCESSING to prevent a
      // second transfer until the provider outcome has been reconciled.
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      await prisma.payout.update({ where: { id: payout.id }, data: { failureReason: 'Transfer outcome unknown; reconciliation required' } });
      await prisma.reconciliationIssue.upsert({
        where: { kind_ref: { kind: 'PAYOUT_OUTCOME_UNKNOWN', ref: payout.id } },
        create: { kind: 'PAYOUT_OUTCOME_UNKNOWN', ref: payout.id, details: 'Check the provider using the payout ID in request notes before taking action.' },
        update: { resolvedAt: null },
      });
      logger.warn('payout transfer outcome unknown', { payoutId: payout.id, gymId: account.gymId, error: message });
    }
  }
  return { created, failed };
};

// From the transfer.processed webhook or an immediately processed transfer.
// The guarded update means the PAYOUT row is written once.
export const markPayoutPaid = (transferId: string) =>
  prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { razorpayTransferId: transferId } });
    if (!payout) return null;
    const claimed = await tx.payout.updateMany({ where: { id: payout.id, status: 'PROCESSING' }, data: { status: 'PAID' } });
    if (!claimed.count) return null;
    await tx.ledgerEntry.create({
      data: { account: 'PAYOUT', amountPaise: -payout.amountPaise, sourceType: 'PAYOUT', sourceId: payout.id, gymId: payout.gymId },
    });
    return payout;
  });

// Only the PROCESSING -> FAILED step notifies, so a repeated webhook stays quiet.
const failPayout = async (where: { id: string } | { razorpayTransferId: string }, reason: string) => {
  const payout = await prisma.payout.findFirst({ where: { ...where, status: 'PROCESSING' }, include: { gym: { select: { name: true } } } });
  if (!payout) return;
  const claimed = await prisma.payout.updateMany({ where: { id: payout.id, status: 'PROCESSING' }, data: { status: 'FAILED', failureReason: reason.slice(0, 500) } });
  if (!claimed.count) return;

  const amount = `₹${(payout.amountPaise / 100).toLocaleString('en-IN')}`;
  await notifyGymOwner({
    gymId: payout.gymId,
    type: 'ERROR',
    title: 'Payout failed',
    message: `Your payout of ${amount} could not be sent. Kavach will retry it in the next weekly payout.`,
    link: '/owner/earnings',
  });
  const admins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN', isActive: true }, select: { id: true } });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: 'ERROR',
      title: 'Payout failed',
      message: `${amount} to ${payout.gym.name} failed: ${reason.slice(0, 200)}`,
      link: '/admin/finance',
    });
  }
};

export const markPayoutFailed = (transferId: string, reason: string) => failPayout({ razorpayTransferId: transferId }, reason);

export const listPayouts = (where: Prisma.PayoutWhereInput = {}) =>
  prisma.payout.findMany({ where, include: { gym: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });

export const setPayoutAccount = async (gymId: string, data: { razorpayAccountId: string; status: string }, userId: string) => {
  if (!(await prisma.gym.count({ where: { id: gymId } }))) throw new Error('GYM_NOT_FOUND');
  const account = await prisma.gymPayoutAccount.upsert({ where: { gymId }, create: { gymId, ...data }, update: data });
  await logAudit({ action: 'PAYOUT_ACCOUNT_SET', entity: 'Gym', entityId: gymId, details: JSON.stringify(data), userId });
  return account;
};

// Daily job. Compares the last day of Razorpay payments, refunds and transfers
// with our orders, refunds and payouts, and only records what disagrees.
export const runReconciliation = async (now = new Date()) => {
  if (!onlinePaymentsEnabled()) return { issues: 0 };
  const rzp = getRazorpay();
  const from = new Date(now.getTime() - DAY_MS);
  const range = { from: Math.floor(from.getTime() / 1000), to: Math.floor(now.getTime() / 1000), count: 100 };
  // Reconciliation must inspect every page, otherwise busy gyms produce false
  // missing-payment alerts and genuine mismatches after row 100 are invisible.
  const allPages = async <T>(fetch: (skip: number) => Promise<{ items: T[] }>) => {
    const items: T[] = [];
    for (let skip = 0; ; skip += range.count) {
      const page = await fetch(skip);
      items.push(...page.items);
      if (page.items.length < range.count) return { items };
    }
  };
  const [payments, refunds, transfers] = await Promise.all([
    allPages((skip) => rzp.payments.all({ ...range, skip })),
    allPages((skip) => rzp.refunds.all({ ...range, skip })),
    allPages((skip) => rzp.transfers.all({ ...range, skip })),
  ]);

  const issues: { kind: string; ref: string; details?: string }[] = [];

  const captured = payments.items.filter((p) => p.status === 'captured' || p.status === 'refunded');
  const orders = await prisma.order.findMany({ where: { razorpayOrderId: { in: captured.flatMap((p) => p.order_id ?? []) } } });
  for (const p of captured) {
    const order = orders.find((o) => o.razorpayOrderId === p.order_id);
    if (!order) continue; // a fee or SaaS payment
    if (order.status === 'CREATED' || order.status === 'FAILED') issues.push({ kind: 'CAPTURED_NOT_PAID', ref: p.id, details: `order ${order.id}` });
    else if (Number(p.amount) !== order.totalPaise) issues.push({ kind: 'AMOUNT_MISMATCH', ref: p.id, details: `order ${order.id}: ${order.totalPaise} vs ${p.amount}` });
  }

  const paidHere = await prisma.order.findMany({ where: { paidAt: { gte: from, lte: now } } });
  for (const o of paidHere) {
    if (!captured.some((p) => p.id === o.razorpayPaymentId)) issues.push({ kind: 'PAID_NOT_CAPTURED', ref: o.id, details: `payment ${o.razorpayPaymentId}` });
  }

  const refundsHere = await prisma.refund.findMany({ where: { status: 'PROCESSED', updatedAt: { gte: from, lte: now } } });
  for (const r of refundsHere) {
    if (!refunds.items.some((x) => x.id === r.razorpayRefundId)) issues.push({ kind: 'REFUND_MISSING', ref: r.id, details: `refund ${r.razorpayRefundId}` });
  }

  const payoutsHere = await prisma.payout.findMany({ where: { razorpayTransferId: { not: null }, createdAt: { gte: from, lte: now } } });
  for (const p of payoutsHere) {
    const transfer = transfers.items.find((t) => t.id === p.razorpayTransferId);
    if (!transfer) issues.push({ kind: 'TRANSFER_MISSING', ref: p.id, details: `transfer ${p.razorpayTransferId}` });
    else if (Number(transfer.amount) !== p.amountPaise) issues.push({ kind: 'AMOUNT_MISMATCH', ref: transfer.id, details: `payout ${p.id}: ${p.amountPaise} vs ${transfer.amount}` });
  }

  const { count } = await prisma.reconciliationIssue.createMany({ data: issues, skipDuplicates: true });
  return { issues: count };
};

// Called from every scheduler tick; each job goes in the queue at most once per period.
const enqueueEvery = async (type: string, periodMs: number) => {
  const recent = await prisma.job.count({ where: { type, createdAt: { gt: new Date(Date.now() - periodMs) } } });
  if (!recent) await prisma.job.create({ data: { type } });
};

export const scheduleMoneyJobs = async () => {
  if (routePayoutsEnabled()) await enqueueEvery('PAYOUTS', 7 * DAY_MS);
  if (onlinePaymentsEnabled()) await enqueueEvery('RECONCILE', DAY_MS);
};
