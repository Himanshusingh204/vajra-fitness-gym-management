import { Prisma, type Order } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { getRazorpay, getPaymentConfig, checkoutSignatureValid } from './payment.service';
import { splitOrder, commissionBpsForGym, GST_BPS } from './commission';
import { DAY_MS } from './membership.service';
import { createNotification, notifyGymOwner } from './notification.service';
import { listRefunds } from './refund.service';
import { availableForPayout, listPayouts, MIN_PAYOUT_PAISE } from './payout.service';

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

const checkoutView = (order: Order) => ({
  id: order.id,
  status: order.status,
  totalPaise: order.totalPaise,
  razorpayOrderId: order.razorpayOrderId,
  amount: order.totalPaise,
  currency: 'INR',
  keyId: getPaymentConfig().keyId,
});

// Member buys a plan. The same Idempotency-Key always returns the same order,
// so a double click or a network retry never opens a second one.
export const createOrder = async (input: { userId: string; gymId: string; planId: string; idempotencyKey: string }) => {
  const rzp = getRazorpay(); // throws PaymentDisabledError when keys are absent
  const key = { memberUserId_idempotencyKey: { memberUserId: input.userId, idempotencyKey: input.idempotencyKey } };

  let order = await prisma.order.findUnique({ where: key });
  if (order && (order.gymId !== input.gymId || order.planId !== input.planId)) throw new Error('IDEMPOTENCY_KEY_REUSED');

  if (!order) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: input.planId }, include: { gym: true } });
    if (!plan || !plan.isActive || plan.gymId !== input.gymId) throw new Error('PLAN_NOT_FOUND');
    if (plan.gym.status !== 'APPROVED') throw new Error('GYM_NOT_FOUND');

    const commissionBps = await commissionBpsForGym(plan.gymId);
    const split = splitOrder(Math.round(plan.price.toNumber() * 100), plan.gym.gstNumber ? GST_BPS : 0, commissionBps);
    if (split.totalPaise <= 0) throw new Error('PLAN_NOT_PURCHASABLE');

    try {
      order = await prisma.order.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          memberUserId: input.userId,
          gymId: plan.gymId,
          planId: plan.id,
          planSnapshot: { name: plan.name, duration: plan.duration, price: plan.price.toString() },
          commissionBps,
          ...split,
        },
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      order = await prisma.order.findUniqueOrThrow({ where: key });
    }
  }

  // Also covers a retry after an earlier Razorpay call failed.
  if (!order.razorpayOrderId && order.status === 'CREATED') {
    const rzpOrder = await rzp.orders.create({
      amount: order.totalPaise,
      currency: 'INR',
      receipt: `ord_${order.id.slice(0, 12)}`,
      notes: { orderId: order.id },
    });
    order = await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzpOrder.id } });
  }

  return checkoutView(order);
};

const ledgerRows = (order: Order) =>
  [
    ['MEMBER_PAID', -order.totalPaise],
    ['GYM_PAYABLE', order.gymNetPaise],
    ['PLATFORM_COMMISSION', order.commissionPaise],
    ['GST_PAYABLE', order.commissionGstPaise],
  ].map(([account, amountPaise]) => ({
    account: account as string,
    amountPaise: amountPaise as number,
    sourceType: 'ORDER',
    sourceId: order.id,
    orderId: order.id,
    gymId: order.gymId,
  }));

// The platform absorbs the Razorpay fee: it comes out of the commission, not the gym's share.
const gatewayFeeRows = (order: Order, feePaise: number) =>
  [
    ['GATEWAY_FEE', feePaise],
    ['PLATFORM_COMMISSION', -feePaise],
  ].map(([account, amountPaise]) => ({
    account: account as string,
    amountPaise: amountPaise as number,
    sourceType: 'GATEWAY_FEE',
    sourceId: order.id,
    orderId: order.id,
    gymId: order.gymId,
  }));

// A purchase at a gym where the member is already active adds the plan's days
// to that membership; otherwise it starts a new one today.
const activateMembership = async (tx: Prisma.TransactionClient, order: Order, paymentId: string) => {
  const { duration } = order.planSnapshot as { duration: number };
  const now = new Date();
  const member = await tx.memberDetails.upsert({
    where: { userId_gymId: { userId: order.memberUserId, gymId: order.gymId } },
    create: { userId: order.memberUserId, gymId: order.gymId, planId: order.planId, status: 'ACTIVE' },
    update: { planId: order.planId, status: 'ACTIVE' },
  });
  const active = await tx.membership.findFirst({
    where: { memberId: member.id, status: 'ACTIVE', endDate: { gt: now } },
    orderBy: { endDate: 'desc' },
  });
  const price = order.basePaise / 100;
  const membership = active
    ? await tx.membership.update({ where: { id: active.id }, data: { endDate: new Date(active.endDate.getTime() + duration * DAY_MS) } })
    : await tx.membership.create({
        data: {
          memberId: member.id,
          gymId: order.gymId,
          planId: order.planId,
          startDate: now,
          endDate: new Date(now.getTime() + duration * DAY_MS),
          originalAmount: price,
          finalAmount: price,
          paymentStatus: 'PAID',
          status: 'ACTIVE',
          paymentMethod: 'ONLINE',
          transactionId: paymentId,
        },
      });
  await tx.fee.create({
    data: {
      memberId: member.id,
      gymId: order.gymId,
      membershipId: membership.id,
      amount: price,
      paymentDate: now,
      dueDate: membership.endDate,
      status: 'PAID',
      paymentMethod: 'ONLINE',
      transactionId: paymentId,
    },
  });
  await tx.order.update({ where: { id: order.id }, data: { membershipId: membership.id } });
  return { membership, extended: Boolean(active) };
};

// Shared by the checkout verify call and the webhook; whichever comes first
// settles. The CREATED -> PAID claim, the ledger rows and the membership commit
// together, so a second call or a second event for the same payment does nothing.
export const settleMarketplaceOrder = async (order: Order, paymentId: string, amountPaise?: number, feePaise?: number) => {
  if (amountPaise != null && amountPaise !== order.totalPaise) {
    console.error('[Orders] captured amount does not match order', { orderId: order.id, amountPaise });
    return null;
  }

  const activated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      // FAILED too: a member can retry a failed card on the same Razorpay order.
      where: { id: order.id, status: { in: ['CREATED', 'FAILED'] } },
      data: { status: 'PAID', razorpayPaymentId: paymentId, paidAt: new Date() },
    });
    if (!claimed.count) return null;
    await tx.ledgerEntry.createMany({ data: ledgerRows(order) });
    return activateMembership(tx, order, paymentId);
  });

  const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  // The fee may only be known to the second caller, so it is written apart from the claim.
  if (feePaise && paid.razorpayPaymentId === paymentId) {
    await prisma.ledgerEntry.createMany({ data: gatewayFeeRows(order, feePaise), skipDuplicates: true });
  }

  if (activated) {
    const until = activated.membership.endDate.toLocaleDateString('en-IN');
    const { name } = order.planSnapshot as { name: string };
    await createNotification({
      userId: order.memberUserId,
      type: 'SUCCESS',
      title: activated.extended ? 'Membership extended' : 'Membership activated',
      message: `Your ${name} is active until ${until}.`,
      link: '/dashboard',
    });
    await notifyGymOwner({ gymId: order.gymId, type: 'INFO', title: 'Plan bought online', message: `A member bought ${name} online.` });
  }
  return paid;
};

// Fast path from Razorpay Checkout's success handler. A valid signature proves
// the payment belongs to this Razorpay order; the webhook may still arrive first.
export const verifyOrderPayment = async (input: { userId: string; orderId: string; paymentId: string; signature: string }) => {
  const rzp = getRazorpay();
  if (!checkoutSignatureValid(input.orderId, input.paymentId, input.signature)) throw new Error('INVALID_SIGNATURE');

  const order = await prisma.order.findUnique({ where: { razorpayOrderId: input.orderId } });
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.memberUserId !== input.userId) throw new Error('ORDER_NOT_OWNED');

  // For the amount check and the fee. If Razorpay can't be reached, settle anyway
  // and let the webhook add the fee row.
  const payment = await rzp.payments.fetch(input.paymentId).catch(() => null);
  const settled = await settleMarketplaceOrder(order, input.paymentId, payment ? Number(payment.amount) : undefined, payment?.fee);
  if (!settled) throw new Error('AMOUNT_MISMATCH');
  return { id: settled.id, status: settled.status, membershipId: settled.membershipId };
};

export const markOrderFailed = (razorpayOrderId: string) =>
  prisma.order.updateMany({ where: { razorpayOrderId, status: 'CREATED' }, data: { status: 'FAILED' } });

const orderListSelect = {
  id: true,
  status: true,
  planSnapshot: true,
  basePaise: true,
  gstPaise: true,
  totalPaise: true,
  commissionPaise: true,
  commissionGstPaise: true,
  gymNetPaise: true,
  razorpayOrderId: true,
  paidAt: true,
  createdAt: true,
  membershipId: true,
  gym: { select: { id: true, name: true } },
} satisfies Prisma.OrderSelect;

export const listMyOrders = (userId: string) =>
  prisma.order.findMany({
    where: { memberUserId: userId },
    select: { ...orderListSelect, refunds: { select: { id: true, status: true, amountPaise: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

export const listOrders = (filter: { status?: string | undefined; gymId?: string | undefined }) =>
  prisma.order.findMany({
    where: { ...(filter.status && { status: filter.status }), ...(filter.gymId && { gymId: filter.gymId }) },
    select: { ...orderListSelect, memberUser: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

// Owner earnings come straight from the ledger; there is no stored balance.
// The Razorpay fee rows are the platform's own cost and stay out of it.
export const getEarnings = async (gymIds: string[]) => {
  const gymFilter = { gymId: { in: gymIds } };
  const [sums, paidOrders, recentOrders, ledger, refunds, payouts, available] = await Promise.all([
    prisma.ledgerEntry.groupBy({ by: ['account'], where: { ...gymFilter, sourceType: { not: 'GATEWAY_FEE' } }, _sum: { amountPaise: true } }),
    prisma.order.count({ where: { ...gymFilter, paidAt: { not: null } } }),
    prisma.order.findMany({
      where: { ...gymFilter, status: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] } },
      select: orderListSelect,
      orderBy: { paidAt: 'desc' },
      take: 20,
    }),
    prisma.ledgerEntry.findMany({
      // The gym's own account: its share of each sale, refunds taken back, payouts sent.
      where: { ...gymFilter, account: { in: ['GYM_PAYABLE', 'PAYOUT', 'ADJUSTMENT'] } },
      select: { id: true, account: true, amountPaise: true, sourceType: true, sourceId: true, createdAt: true, gym: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    listRefunds({ order: gymFilter }),
    listPayouts(gymFilter),
    Promise.all(gymIds.map((id) => availableForPayout(id))),
  ]);
  const total = (account: string) => sums.find((s) => s.account === account)?._sum.amountPaise ?? 0;
  return {
    grossPaise: -total('MEMBER_PAID'),
    commissionPaise: total('PLATFORM_COMMISSION'),
    commissionGstPaise: total('GST_PAYABLE'),
    payablePaise: total('GYM_PAYABLE'),
    balancePaise: total('GYM_PAYABLE') + total('PAYOUT') + total('ADJUSTMENT'),
    // Past the 7-day hold and not already on its way; paid out weekly once it reaches the minimum.
    availablePaise: available.reduce((sum, n) => sum + Math.max(0, n), 0),
    minPayoutPaise: MIN_PAYOUT_PAISE,
    paidOrders,
    recentOrders,
    ledger,
    refunds,
    payouts,
  };
};
