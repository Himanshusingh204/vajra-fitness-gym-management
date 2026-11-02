import { describe, it, expect, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedMember, seedPlan, seedSuperAdmin, authToken, authPost, authGet } from './helpers';
import { getRazorpay } from '../src/services/payment.service';

const enablePayments = () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_keyid';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
};

afterEach(() => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  vi.restoreAllMocks();
});

let rzpSeq = 0;
const mockRazorpayOrders = () =>
  vi.spyOn(getRazorpay().orders, 'create').mockImplementation(async () => ({ id: `order_test${++rzpSeq}` }) as any);

const sendWebhook = (body: object, eventId: string) => {
  const signature = crypto.createHmac('sha256', 'whsec_test').update(JSON.stringify(body)).digest('hex');
  return authPost('', '/api/payments/webhook', body).set('x-razorpay-signature', signature).set('x-razorpay-event-id', eventId);
};

const captured = (razorpayOrderId: string, amount: number) => ({
  event: 'payment.captured',
  payload: { payment: { entity: { id: 'pay_test123', order_id: razorpayOrderId, amount } } },
});

// A member of another gym buying a Rs 1000 plan at a GST-registered gym.
const setup = async () => {
  const { user: owner, gym } = await seedAdmin();
  await prisma.gym.update({ where: { id: gym.id }, data: { gstNumber: '27ABCDE1234F1Z5' } });
  const plan = await seedPlan(gym.id, { price: 1000, duration: 30 });
  const other = await seedAdmin();
  const { user: member } = await seedMember(other.gym.id);
  return { owner, gym, plan, member, memberToken: await authToken(member) };
};

const buy = (token: string, body: object, key = 'key-1') =>
  authPost(token, '/api/orders', body).set('Idempotency-Key', key);

describe('Marketplace orders', () => {
  it('returns 503 when payments are disabled', async () => {
    const { gym, plan, memberToken } = await setup();
    const res = await buy(memberToken, { gymId: gym.id, planId: plan.id });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('PAYMENTS_DISABLED');
  });

  it('requires an Idempotency-Key header', async () => {
    enablePayments();
    const { gym, plan, memberToken } = await setup();
    const res = await authPost(memberToken, '/api/orders', { gymId: gym.id, planId: plan.id });
    expect(res.status).toBe(400);
  });

  it('creates one order per idempotency key with the commission split', async () => {
    enablePayments();
    const create = mockRazorpayOrders();
    const { gym, plan, memberToken } = await setup();

    const first = await buy(memberToken, { gymId: gym.id, planId: plan.id });
    const again = await buy(memberToken, { gymId: gym.id, planId: plan.id });
    expect(first.status).toBe(201);
    expect(again.body.id).toBe(first.body.id);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]![0]).toMatchObject({ amount: 118000, currency: 'INR' });

    const order = await prisma.order.findUniqueOrThrow({ where: { id: first.body.id } });
    expect(order).toMatchObject({ basePaise: 100000, gstPaise: 18000, totalPaise: 118000, commissionPaise: 10000, commissionGstPaise: 1800, gymNetPaise: 106200 });
  });

  it('uses the gym commission override', async () => {
    enablePayments();
    mockRazorpayOrders();
    const { gym, plan, memberToken } = await setup();
    await prisma.commissionRule.createMany({ data: [{ gymId: null, percentBps: 1200 }, { gymId: gym.id, percentBps: 500 }] });
    const res = await buy(memberToken, { gymId: gym.id, planId: plan.id });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(order.commissionBps).toBe(500);
    expect(order.commissionPaise).toBe(5000);
  });

  it('settles once on a double-delivered webhook and activates the membership', async () => {
    enablePayments();
    mockRazorpayOrders();
    const { owner, gym, plan, member, memberToken } = await setup();
    const { body: checkout } = await buy(memberToken, { gymId: gym.id, planId: plan.id });

    const event = captured(checkout.razorpayOrderId, 118000);
    const [a, b] = await Promise.all([sendWebhook(event, 'evt_1'), sendWebhook(event, 'evt_1')]);
    const c = await sendWebhook(event, 'evt_2'); // same payment under a new event id
    expect([a.status, b.status, c.status]).toEqual([200, 200, 200]);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: checkout.id } });
    expect(order.status).toBe('PAID');
    expect(order.membershipId).toBeTruthy();

    const rows = await prisma.ledgerEntry.findMany({ where: { orderId: order.id } });
    expect(rows).toHaveLength(4);
    expect(rows.reduce((sum, r) => sum + r.amountPaise, 0)).toBe(0);
    expect(rows.find((r) => r.account === 'GYM_PAYABLE')?.amountPaise).toBe(106200);

    const memberships = await prisma.membership.findMany({ where: { gymId: gym.id, member: { userId: member.id } } });
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({ status: 'ACTIVE', paymentStatus: 'PAID', planId: plan.id });

    const mine = await authGet(memberToken, '/api/orders/mine');
    expect(mine.body[0]).toMatchObject({ id: order.id, status: 'PAID' });

    const earnings = await authGet(await authToken(owner), '/api/owner/earnings');
    expect(earnings.body).toMatchObject({ grossPaise: 118000, commissionPaise: 10000, commissionGstPaise: 1800, payablePaise: 106200, paidOrders: 1 });

    const admin = await authGet(await authToken(await seedSuperAdmin()), '/api/admin/orders');
    expect(admin.body.map((o: { id: string }) => o.id)).toContain(order.id);
  });

  it('ignores a captured amount that does not match the order', async () => {
    enablePayments();
    mockRazorpayOrders();
    const { gym, plan, memberToken } = await setup();
    const { body: checkout } = await buy(memberToken, { gymId: gym.id, planId: plan.id });
    await sendWebhook(captured(checkout.razorpayOrderId, 100), 'evt_x');
    const order = await prisma.order.findUniqueOrThrow({ where: { id: checkout.id } });
    expect(order.status).toBe('CREATED');
    expect(await prisma.ledgerEntry.count()).toBe(0);
  });

  it("keeps owners out of other gyms' earnings", async () => {
    const { gym } = await setup();
    const stranger = await seedAdmin();
    const res = await authGet(await authToken(stranger.user), `/api/owner/earnings?gymId=${gym.id}`);
    expect(res.status).toBe(403);
  });
});
