import { Prisma, type Order } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';
import { canAccessGym } from '../utils/tenant';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { getRazorpay } from './payment.service';
import { splitRefund } from './commission';
import { DAY_MS } from './membership.service';
import { createNotification, notifyGymOwner } from './notification.service';

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

// Refund requests and approvals for one order run one at a time, so two of
// them can't both pass the "not more than what is left" check.
const lockOrder = (tx: Prisma.TransactionClient, orderId: string) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`refund:${orderId}`}))`;

const sumOf = (refunds: { amountPaise: number; status: string }[], statuses: string[]) =>
  refunds.filter((r) => statuses.includes(r.status)).reduce((sum, r) => sum + r.amountPaise, 0);

// Member asks for money back on a paid order. Defaults to whatever is not yet refunded.
export const requestRefund = async (input: { userId: string; orderId: string; amountPaise?: number | undefined; reason?: string | undefined }) => {
  const { order, refund, amountPaise } = await prisma.$transaction(async (tx) => {
    await lockOrder(tx, input.orderId);
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { refunds: true } });
    if (!order || order.memberUserId !== input.userId) throw new Error('ORDER_NOT_FOUND');
    if (order.status !== 'PAID' && order.status !== 'PARTIALLY_REFUNDED') throw new Error('ORDER_NOT_REFUNDABLE');
    if (order.refunds.some((r) => r.status === 'REQUESTED' || r.status === 'PROCESSING')) throw new Error('REFUND_PENDING');

    const left = order.totalPaise - sumOf(order.refunds, ['PROCESSED']);
    const amountPaise = input.amountPaise ?? left;
    if (amountPaise <= 0 || amountPaise > left) throw new Error('REFUND_AMOUNT_INVALID');

    const refund = await tx.refund.create({
      data: { orderId: order.id, amountPaise, reason: input.reason ?? null, requestedById: input.userId },
    });
    return { order, refund, amountPaise };
  });
  await notifyGymOwner({
    gymId: order.gymId,
    type: 'WARNING',
    title: 'Refund requested',
    message: `A member asked for a refund of ${rupees(amountPaise)}. Approve or reject it under Earnings.`,
  });
  return refund;
};

// Owner of the gym or a super admin. Approving refunds through Razorpay first,
// then writes the reversal rows. An uncertain provider outcome remains PROCESSING
// until an operator reconciles it, preventing a second refund on retry.
export const decideRefund = async (input: { refundId: string; decision: 'APPROVED' | 'REJECTED'; user: AuthRequest['user'] }) => {
  const refund = await prisma.refund.findUnique({ where: { id: input.refundId }, include: { order: { include: { refunds: true } } } });
  if (!refund) throw new Error('REFUND_NOT_FOUND');
  if (!(await canAccessGym(input.user, refund.order.gymId))) throw new Error('FORBIDDEN');
  const decided = { decidedById: input.user!.userId, decidedAt: new Date() };

  if (input.decision === 'REJECTED') {
    const claimed = await prisma.refund.updateMany({ where: { id: refund.id, status: 'REQUESTED' }, data: { status: 'REJECTED', ...decided } });
    if (!claimed.count) throw new Error('REFUND_NOT_PENDING');
    await createNotification({
      userId: refund.order.memberUserId,
      type: 'WARNING',
      title: 'Refund declined',
      message: `Your refund request of ${rupees(refund.amountPaise)} was declined by the gym.`,
      link: '/dashboard',
    });
    return prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
  }

  const rzp = getRazorpay(); // throws PaymentDisabledError when keys are absent
  const { order } = refund;
  if (!order.razorpayPaymentId) throw new Error('ORDER_NOT_REFUNDABLE');

  // Refunds already PROCESSING count as taken, so a racing approval sees them.
  const { refundedPaise, split } = await prisma.$transaction(async (tx) => {
    await lockOrder(tx, order.id);
    const others = await tx.refund.findMany({ where: { orderId: order.id, id: { not: refund.id }, status: { in: ['PROCESSED', 'PROCESSING'] } } });
    const refundedPaise = sumOf(others, ['PROCESSED', 'PROCESSING']);
    const split = splitRefund(order, refundedPaise, refund.amountPaise);
    const claimed = await tx.refund.updateMany({ where: { id: refund.id, status: 'REQUESTED' }, data: { status: 'PROCESSING', ...decided } });
    if (!claimed.count) throw new Error('REFUND_NOT_PENDING');
    return { refundedPaise, split };
  });

  let providerRefund;
  try {
    providerRefund = await rzp.payments.refund(order.razorpayPaymentId, { amount: refund.amountPaise, notes: { refundId: refund.id } });
  } catch {
    // A timeout or connection failure does not prove that Razorpay rejected the
    // request. Never automatically retry a potentially completed money movement.
    await prisma.reconciliationIssue.upsert({
      where: { kind_ref: { kind: 'REFUND_OUTCOME_UNKNOWN', ref: refund.id } },
      create: { kind: 'REFUND_OUTCOME_UNKNOWN', ref: refund.id, details: 'Check the provider using the refund ID in request notes before taking action.' },
      update: { resolvedAt: null },
    });
    throw new Error('REFUND_OUTCOME_UNKNOWN');
  }

  const rows = [
    ['MEMBER_PAID', refund.amountPaise],
    ['GYM_PAYABLE', -split.gymNetPaise],
    ['PLATFORM_COMMISSION', -split.commissionPaise],
    ['GST_PAYABLE', -split.commissionGstPaise],
  ].map(([account, amountPaise]) => ({
    account: account as string,
    amountPaise: amountPaise as number,
    sourceType: 'REFUND',
    sourceId: refund.id,
    orderId: order.id,
    gymId: order.gymId,
  }));

  const fullyRefunded = refundedPaise + refund.amountPaise === order.totalPaise;
  const processed = await prisma.$transaction(async (tx) => {
    const updated = await tx.refund.update({ where: { id: refund.id }, data: { status: 'PROCESSED', razorpayRefundId: providerRefund.id } });
    await tx.ledgerEntry.createMany({ data: rows });
    await tx.order.update({ where: { id: order.id }, data: { status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } });
    await tx.fee.updateMany({ where: { transactionId: order.razorpayPaymentId }, data: { status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } });
    if (fullyRefunded) await endPaidAccess(tx, order);
    return updated;
  });

  await logAudit({
    action: 'ORDER_REFUNDED',
    entity: 'Order',
    entityId: order.id,
    details: JSON.stringify({ refundId: refund.id, razorpayRefundId: providerRefund.id, amountPaise: refund.amountPaise }),
    userId: input.user!.userId,
  });
  await createNotification({
    userId: order.memberUserId,
    type: 'SUCCESS',
    title: 'Refund approved',
    message: `${rupees(refund.amountPaise)} is on its way back to your original payment method.`,
    link: '/dashboard',
  });
  return processed;
};

// A full refund takes back what the order bought: the membership it started is
// cancelled, or the days it added to an existing one come off the end date.
const endPaidAccess = async (tx: Prisma.TransactionClient, order: Order) => {
  if (!order.membershipId) return;
  const membership = await tx.membership.findUniqueOrThrow({ where: { id: order.membershipId } });
  const startedHere = membership.transactionId === order.razorpayPaymentId;
  const laterOrders = await tx.order.count({
    where: { membershipId: membership.id, id: { not: order.id }, status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } },
  });
  if (startedHere && !laterOrders) {
    await tx.membership.update({ where: { id: membership.id }, data: { status: 'CANCELLED' } });
    return;
  }
  const { duration } = order.planSnapshot as { duration: number };
  await tx.membership.update({ where: { id: membership.id }, data: { endDate: new Date(membership.endDate.getTime() - duration * DAY_MS) } });
};

export const listRefunds = (where: Prisma.RefundWhereInput = {}) =>
  prisma.refund.findMany({
    where,
    include: {
      order: {
        select: {
          id: true,
          totalPaise: true,
          planSnapshot: true,
          gym: { select: { id: true, name: true } },
          memberUser: { select: { username: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
