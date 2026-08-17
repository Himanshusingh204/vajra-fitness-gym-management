import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';
import { createNotification, notifyGymOwner } from './notification.service';

// Razorpay credentials. Online payments are fully disabled (UI + API) until a
// key pair is configured — this keeps the app functional without an API key.
// Env is read lazily so tests can toggle state between requests.
const keyId = () => process.env.RAZORPAY_KEY_ID?.trim() ?? '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET?.trim() ?? '';
const webhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? '';

export const onlinePaymentsEnabled = () => Boolean(keyId() && keySecret());

export const getPaymentConfig = () => ({
  enabled: onlinePaymentsEnabled(),
  keyId: onlinePaymentsEnabled() ? keyId() : null,
});

export class PaymentDisabledError extends Error {
  constructor() {
    super('ONLINE_PAYMENTS_DISABLED');
    this.name = 'PaymentDisabledError';
  }
}

// Lazy singleton — never constructed until an order is actually created.
let client: Razorpay | null = null;
export const getRazorpay = () => {
  if (!onlinePaymentsEnabled()) throw new PaymentDisabledError();
  if (!client) client = new Razorpay({ key_id: keyId(), key_secret: keySecret() });
  return client;
};

export const toPaise = (amount: number) => Math.round(amount * 100);

// Constant-time comparison used for the checkout (orderId|paymentId) signature.
export const verifyRazorpaySignature = (payload: string, signature: string, secret: string) => {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  const received = Buffer.from(signature, 'hex');
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
};

// Fetches a fee and checks it belongs to the authenticated user.
const getOwnedPendingFee = async (feeId: string, userId: string) => {
  const fee = await prisma.fee.findUnique({
    where: { id: feeId },
    include: {
      member: { include: { user: { select: { id: true, username: true } } } },
      gym: { select: { id: true, name: true } },
    },
  });
  if (!fee) throw new Error('FEE_NOT_FOUND');
  if (fee.member.user.id !== userId) throw new Error('FEE_NOT_OWNED');
  if (fee.status === 'PAID') throw new Error('FEE_ALREADY_PAID');
  if (fee.amount.toNumber() <= 0) throw new Error('FEE_AMOUNT_INVALID');
  return fee;
};

// Creates a Razorpay order for a pending fee belonging to the member.
export const createPaymentOrder = async (input: { feeId: string; userId: string }) => {
  const rzp = getRazorpay(); // throws PaymentDisabledError when keys are absent
  const fee = await getOwnedPendingFee(input.feeId, input.userId);

  const amountPaise = toPaise(fee.amount.toNumber());
  const rzpOrder = await rzp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `fee_${fee.id.slice(0, 12)}`,
    notes: { feeId: fee.id },
  });

  await prisma.paymentOrder.create({
    data: {
      orderId: rzpOrder.id,
      amount: amountPaise,
      currency: 'INR',
      status: 'CREATED',
      feeId: fee.id,
    },
  });

  return { orderId: rzpOrder.id, amount: amountPaise, currency: 'INR', keyId: keyId(), feeId: fee.id };
};

// Marks a PaymentOrder + linked fee as settled. Idempotent: the order is claimed
// with a guarded update so concurrent webhook/verify calls settle it exactly once.
const settleOrder = async (paymentOrderId: string, paymentId: string) => {
  const { order, fee } = await prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.findUnique({ where: { id: paymentOrderId }, include: { fee: true } });
    if (!order) throw new Error('ORDER_NOT_FOUND');

    if (order.status === 'PAID') {
      const existing = await tx.fee.findUnique({ where: { id: order.feeId } });
      return { order, fee: existing };
    }

    const claimed = await tx.paymentOrder.updateMany({
      where: { id: order.id, status: 'CREATED' },
      data: { status: 'PAID', paymentId },
    });
    if (claimed.count === 0) {
      // Lost a race — another settle already captured this order.
      const existing = await tx.fee.findUnique({ where: { id: order.feeId } });
      return { order, fee: existing };
    }

    const fee = await tx.fee.update({
      where: { id: order.feeId },
      data: { status: 'PAID', paymentMethod: 'ONLINE', transactionId: paymentId, paymentDate: new Date() },
    });

    if (fee.membershipId) {
      await tx.membership.update({
        where: { id: fee.membershipId },
        data: { paymentStatus: 'PAID', paymentMethod: 'ONLINE', transactionId: paymentId },
      });
    }

    return { order, fee };
  });

  if (!fee) throw new Error('FEE_NOT_FOUND');

  await logAudit({
    action: 'PAYMENT_CAPTURED',
    entity: 'Fee',
    entityId: fee.id,
    details: JSON.stringify({ paymentId, orderId: order.orderId, amount: order.amount }),
    userId: null,
  });

  return { order, fee, alreadySettled: order.status === 'PAID' };
};

// Verifies the client-side checkout response and settles the fee.
export const verifyPayment = async (input: {
  orderId: string;
  paymentId: string;
  signature: string;
  userId: string;
}) => {
  const expectedPayload = `${input.orderId}|${input.paymentId}`;
  if (!verifyRazorpaySignature(expectedPayload, input.signature, keySecret())) {
    throw new Error('INVALID_SIGNATURE');
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { orderId: input.orderId },
    include: { fee: { include: { member: { include: { user: { select: { id: true, username: true } } } }, gym: { select: { id: true, name: true } } } } },
  });
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.fee.member.user.id !== input.userId) throw new Error('ORDER_NOT_OWNED');

  const { fee, alreadySettled } = await settleOrder(order.id, input.paymentId);
  if (!alreadySettled) {
    await createNotification({
      userId: order.fee.member.user.id,
      type: 'SUCCESS',
      title: 'Payment successful',
      message: `Your payment of ₹${order.fee.amount.toNumber().toLocaleString('en-IN')} via Razorpay has been received.`,
      link: '/dashboard',
    });
    await notifyGymOwner({
      gymId: order.fee.gym.id,
      type: 'INFO',
      title: 'Online payment received',
      message: `${order.fee.member.user.username} paid ₹${order.fee.amount.toNumber().toLocaleString('en-IN')} online (${input.paymentId}).`,
    });
  }

  return { fee, orderId: order.orderId };
};

// Validates + processes Razorpay webhook events. Returns a plain object so the
// route can respond 200 quickly and let Razorpay stop retrying.
export const handleWebhook = async (rawBody: string, signature: string) => {
  if (!webhookSecret()) throw new Error('WEBHOOK_SECRET_MISSING');
  if (!Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret())) {
    throw new Error('INVALID_WEBHOOK_SIGNATURE');
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } };
  };

  if (event.event === 'payment.captured') {
    const entity = event.payload?.payment?.entity;
    const orderId = entity?.order_id;
    const paymentId = entity?.id;
    if (orderId && paymentId) {
      const order = await prisma.paymentOrder.findUnique({ where: { orderId } });
      if (order && order.status !== 'PAID') {
        const { fee, alreadySettled } = await settleOrder(order.id, paymentId);
        if (!alreadySettled) {
          const feeWithMember = await prisma.fee.findUnique({
            where: { id: fee.id },
            include: { member: { include: { user: { select: { id: true, username: true } } } }, gym: { select: { name: true } } },
          });
          if (feeWithMember) {
            await createNotification({
              userId: feeWithMember.member.user.id,
              type: 'SUCCESS',
              title: 'Payment successful',
              message: `Your payment of ₹${fee.amount.toNumber().toLocaleString('en-IN')} via Razorpay has been received.`,
              link: '/dashboard',
            });
          }
        }
      } else {
        // No matching fee order — it may be an online SaaS subscription payment.
        await settleSaaSOrderByRazorpayOrder(orderId, paymentId);
      }
    }
  }

  return { received: true };
};

// ---- SaaS subscription payments ----

// Creates a Razorpay order for a PENDING platform subscription and stores the
// order id on the record. Throws PaymentDisabledError when keys are absent.
export const createSaaSOrder = async (subscriptionId: string) => {
  const rzp = getRazorpay();
  const sub = await prisma.gymSubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');

  const amountPaise = toPaise(sub.amount.toNumber());
  const rzpOrder = await rzp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `saas_${sub.id.slice(0, 12)}`,
    notes: { subscriptionId: sub.id },
  });

  await prisma.gymSubscription.update({
    where: { id: sub.id },
    data: { razorpayOrderId: rzpOrder.id },
  });

  return { orderId: rzpOrder.id, amount: amountPaise, currency: 'INR', keyId: keyId(), subscriptionId: sub.id };
};

// Activates a PENDING subscription after its Razorpay payment settles.
// Idempotent: only PENDING records are transitioned, so concurrent
// webhook/verify calls activate the subscription exactly once.
export const settleSaaSOrder = async (subscriptionId: string, paymentId: string) => {
  const { subscription, alreadyActive } = await prisma.$transaction(async (tx) => {
    const sub = await tx.gymSubscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
    if (sub.status === 'ACTIVE') return { subscription: sub, alreadyActive: true };

    const claimed = await tx.gymSubscription.updateMany({
      where: { id: sub.id, status: 'PENDING' },
      data: { status: 'ACTIVE', razorpayPaymentId: paymentId, paidAt: new Date() },
    });
    if (claimed.count === 0) {
      const existing = await tx.gymSubscription.findUnique({ where: { id: sub.id } });
      return { subscription: existing ?? sub, alreadyActive: true };
    }
    return { subscription: { ...sub, status: 'ACTIVE' as const }, alreadyActive: false };
  });

  return { subscription, alreadyActive };
};

// Verifies the client-side Razorpay checkout response for a SaaS subscription.
export const verifySaaSOrder = async (input: {
  orderId: string;
  paymentId: string;
  signature: string;
  userId: string;
  role: string;
}) => {
  const expectedPayload = `${input.orderId}|${input.paymentId}`;
  if (!verifyRazorpaySignature(expectedPayload, input.signature, keySecret())) {
    throw new Error('INVALID_SIGNATURE');
  }

  const sub = await prisma.gymSubscription.findFirst({
    where: { razorpayOrderId: input.orderId },
    include: { plan: true, gym: { select: { id: true, name: true, ownerId: true } } },
  });
  if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
  if (input.role !== 'SUPER_ADMIN' && sub.gym.ownerId !== input.userId) {
    throw new Error('SUBSCRIPTION_NOT_OWNED');
  }

  const { alreadyActive } = await settleSaaSOrder(sub.id, input.paymentId);
  if (!alreadyActive) {
    await createNotification({
      userId: sub.gym.ownerId,
      type: 'SUCCESS',
      title: 'Subscription active',
      message: `Your ${sub.plan.name} plan is now active. Payment of ₹${sub.amount.toNumber().toLocaleString('en-IN')} received.`,
      link: '/admin/gym',
    });
    await logAudit({
      action: 'SUBSCRIPTION_PAID',
      entity: 'GymSubscription',
      entityId: sub.id,
      details: JSON.stringify({ paymentId: input.paymentId, orderId: input.orderId, amount: sub.amount }),
      userId: input.role === 'SUPER_ADMIN' ? null : input.userId,
    });
  }

  return { subscription: sub, alreadyActive };
};

// Webhook path for online SaaS payments: looks the subscription up by the
// Razorpay order id and activates it.
export const settleSaaSOrderByRazorpayOrder = async (orderId: string, paymentId: string) => {
  const sub = await prisma.gymSubscription.findFirst({
    where: { razorpayOrderId: orderId },
    include: { plan: true, gym: { select: { ownerId: true } } },
  });
  if (!sub || sub.status !== 'PENDING') return null;

  const { subscription, alreadyActive } = await settleSaaSOrder(sub.id, paymentId);
  if (!alreadyActive) {
    await createNotification({
      userId: sub.gym.ownerId,
      type: 'SUCCESS',
      title: 'Subscription active',
      message: `Your ${sub.plan.name} plan is now active. Payment of ₹${sub.amount.toNumber().toLocaleString('en-IN')} received.`,
      link: '/admin/gym',
    });
  }
  return subscription;
};

// ---- Refunds ----

// Refunds a fee that was captured through an online Razorpay payment. Only
// callable by the gym owner or Super Admin (not the member) — this reverses
// real money, so it's an admin action, not a self-service one. Supports a
// partial amount (e.g. correcting an overcharge); defaults to a full refund.
export const refundFeePayment = async (input: {
  feeId: string;
  requesterId: string;
  requesterRole: string;
  amount?: number;
  reason?: string;
}) => {
  const fee = await prisma.fee.findUnique({
    where: { id: input.feeId },
    include: {
      gym: { select: { id: true, name: true, ownerId: true } },
      member: { include: { user: { select: { id: true, username: true } } } },
    },
  });
  if (!fee) throw new Error('FEE_NOT_FOUND');

  const isSuperAdmin = input.requesterRole === 'SUPER_ADMIN';
  const isGymOwner = fee.gym.ownerId === input.requesterId;
  if (!isSuperAdmin && !isGymOwner) throw new Error('UNAUTHORIZED');

  if (fee.status !== 'PAID' || fee.paymentMethod !== 'ONLINE' || !fee.transactionId) {
    throw new Error('FEE_NOT_REFUNDABLE');
  }

  const fullAmountPaise = toPaise(fee.amount.toNumber());
  const refundAmountPaise = input.amount != null ? toPaise(input.amount) : fullAmountPaise;
  if (refundAmountPaise <= 0 || refundAmountPaise > fullAmountPaise) {
    throw new Error('REFUND_AMOUNT_INVALID');
  }

  const rzp = getRazorpay(); // throws PaymentDisabledError when keys are absent
  const refund = await rzp.payments.refund(fee.transactionId, {
    amount: refundAmountPaise,
    notes: input.reason ? { reason: input.reason } : undefined,
  });

  const isFullRefund = refundAmountPaise === fullAmountPaise;
  const refundNote = `Refunded ₹${(refundAmountPaise / 100).toLocaleString('en-IN')} (${refund.id})${input.reason ? `: ${input.reason}` : ''}`;

  const updatedFee = await prisma.fee.update({
    where: { id: fee.id },
    data: {
      status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      notes: fee.notes ? `${fee.notes}\n${refundNote}` : refundNote,
    },
  });

  await prisma.paymentOrder.updateMany({
    where: { feeId: fee.id, status: 'PAID' },
    data: { status: isFullRefund ? 'REFUNDED' : 'PAID' },
  });

  await logAudit({
    action: 'PAYMENT_REFUNDED',
    entity: 'Fee',
    entityId: fee.id,
    details: JSON.stringify({ refundId: refund.id, amount: refundAmountPaise, reason: input.reason ?? null }),
    userId: input.requesterId,
  });

  await createNotification({
    userId: fee.member.user.id,
    type: 'INFO',
    title: 'Payment refunded',
    message: `₹${(refundAmountPaise / 100).toLocaleString('en-IN')} of your payment for ${fee.gym.name} has been refunded.`,
    link: '/dashboard',
  });

  return { fee: updatedFee, refund };
};
