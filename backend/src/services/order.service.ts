import { Prisma, type Order } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { getRazorpay, getPaymentConfig } from './payment.service';
import { splitOrder, commissionBpsForGym, GST_BPS } from './commission';
import { createMembership } from './membership.service';

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

// Webhook side of a marketplace order. The CREATED -> PAID claim and the ledger
// rows commit together, so a redelivered or racing event credits the gym once.
export const settleMarketplaceOrder = async (order: Order, paymentId: string, amountPaise?: number) => {
  if (amountPaise != null && amountPaise !== order.totalPaise) {
    console.error('[Orders] captured amount does not match order', { orderId: order.id, amountPaise });
    return null;
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      // FAILED too: a member can retry a failed card on the same Razorpay order.
      where: { id: order.id, status: { in: ['CREATED', 'FAILED'] } },
      data: { status: 'PAID', razorpayPaymentId: paymentId, paidAt: new Date() },
    });
    if (claimed.count) await tx.ledgerEntry.createMany({ data: ledgerRows(order) });
  });

  // Activation runs after the money commit. If it throws, the webhook event is
  // released and Razorpay's retry lands here again with membershipId still null.
  const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (paid.status !== 'PAID' || paid.membershipId) return paid;

  const member = await prisma.memberDetails.upsert({
    where: { userId_gymId: { userId: paid.memberUserId, gymId: paid.gymId } },
    create: { userId: paid.memberUserId, gymId: paid.gymId, status: 'ACTIVE' },
    update: {},
  });
  const membership = await createMembership({
    memberId: member.id,
    gymId: paid.gymId,
    planId: paid.planId,
    paymentStatus: 'PAID',
    paymentMethod: 'ONLINE',
    transactionId: paymentId,
  });
  return prisma.order.update({ where: { id: paid.id }, data: { membershipId: membership.id } });
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
  prisma.order.findMany({ where: { memberUserId: userId }, select: orderListSelect, orderBy: { createdAt: 'desc' }, take: 50 });

export const listOrders = (filter: { status?: string | undefined; gymId?: string | undefined }) =>
  prisma.order.findMany({
    where: { ...(filter.status && { status: filter.status }), ...(filter.gymId && { gymId: filter.gymId }) },
    select: { ...orderListSelect, memberUser: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

// Owner earnings come straight from the ledger; there is no stored balance.
export const getEarnings = async (gymIds: string[]) => {
  const [sums, recentOrders] = await Promise.all([
    prisma.ledgerEntry.groupBy({ by: ['account'], where: { gymId: { in: gymIds } }, _sum: { amountPaise: true }, _count: true }),
    prisma.order.findMany({
      where: { gymId: { in: gymIds }, status: { in: ['PAID', 'REFUNDED'] } },
      select: orderListSelect,
      orderBy: { paidAt: 'desc' },
      take: 20,
    }),
  ]);
  const total = (account: string) => sums.find((s) => s.account === account)?._sum.amountPaise ?? 0;
  return {
    grossPaise: -total('MEMBER_PAID'),
    commissionPaise: total('PLATFORM_COMMISSION'),
    commissionGstPaise: total('GST_PAYABLE'),
    payablePaise: total('GYM_PAYABLE'),
    paidOrders: sums.find((s) => s.account === 'MEMBER_PAID')?._count ?? 0,
    recentOrders,
  };
};
