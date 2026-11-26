import { describe, it, expect, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedMember, seedPlan, seedSuperAdmin, authToken, authPost, authGet, authPut } from './helpers';
import { getRazorpay } from '../src/services/payment.service';
import { runPayouts, runReconciliation, scheduleMoneyJobs } from '../src/services/payout.service';
import { runJobs } from '../src/jobs/queue';

const DAY = 24 * 60 * 60 * 1000;

const enablePayments = () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_keyid';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
};

afterEach(() => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  delete process.env.RAZORPAY_ROUTE_ENABLED;
  vi.restoreAllMocks();
});

const sendWebhook = (body: object, eventId: string) => {
  const signature = crypto.createHmac('sha256', 'whsec_test').update(JSON.stringify(body)).digest('hex');
  return authPost('', '/api/payments/webhook', body).set('x-razorpay-signature', signature).set('x-razorpay-event-id', eventId);
};

let seq = 0;

// A Rs 1000 plan at a GST-registered gym, bought and captured: total 118000,
// commission 10000, GST on it 1800, gym's share 106200.
const paidOrder = async (price = 1000) => {
  enablePayments();
  const { user: owner, gym } = await seedAdmin();
  await prisma.gym.update({ where: { id: gym.id }, data: { gstNumber: '27ABCDE1234F1Z5' } });
  const plan = await seedPlan(gym.id, { price, duration: 30 });
  const { user: member } = await seedMember((await seedAdmin()).gym.id);
  const memberToken = await authToken(member);

  const n = ++seq;
  vi.spyOn(getRazorpay().orders, 'create').mockResolvedValue({ id: `order_money${n}` } as any);
  const { body: checkout } = await authPost(memberToken, '/api/orders', { gymId: gym.id, planId: plan.id }).set('Idempotency-Key', `k${n}`);
  await sendWebhook(
    { event: 'payment.captured', payload: { payment: { entity: { id: `pay_money${n}`, order_id: checkout.razorpayOrderId, amount: checkout.amount } } } },
    `evt_money${n}`,
  );
  const order = await prisma.order.findUniqueOrThrow({ where: { id: checkout.id } });
  expect(order.status).toBe('PAID');
  return { owner, gym, order, member, memberToken, ownerToken: await authToken(owner) };
};

const sumBy = async (where: object) => {
  const rows = await prisma.ledgerEntry.findMany({ where });
  const by: Record<string, number> = {};
  for (const r of rows) by[r.account] = (by[r.account] ?? 0) + r.amountPaise;
  return { rows, by, total: rows.reduce((sum, r) => sum + r.amountPaise, 0) };
};

const mockRefund = () =>
  vi.spyOn(getRazorpay().payments, 'refund').mockImplementation(async () => ({ id: `rfnd_${crypto.randomUUID().slice(0, 8)}` }) as any);

describe('Refunds', () => {
  it('reverses the ledger in proportion and fully over two part refunds', async () => {
    const { order, memberToken, ownerToken } = await paidOrder();
    const refund = mockRefund();

    const first = await authPost(memberToken, `/api/orders/${order.id}/refund-request`, { amountPaise: 39333, reason: 'Moved city' });
    expect(first.status).toBe(201);
    expect((await authPost(memberToken, `/api/orders/${order.id}/refund-request`, {})).status).toBe(409);

    const approved = await authPost(ownerToken, `/api/refunds/${first.body.id}/decide`, { decision: 'APPROVED' });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('PROCESSED');
    expect(refund).toHaveBeenCalledWith(`pay_money${seq}`, expect.objectContaining({ amount: 39333 }));

    const part = await sumBy({ sourceType: 'REFUND', sourceId: first.body.id });
    expect(part.total).toBe(0);
    expect(part.by).toEqual({ MEMBER_PAID: 39333, PLATFORM_COMMISSION: -3333, GST_PAYABLE: -600, GYM_PAYABLE: -35400 });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PARTIALLY_REFUNDED');
    // A part refund leaves the membership alone.
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: order.membershipId! } })).status).toBe('ACTIVE');

    // The rest, approved by an admin this time.
    const second = await authPost(memberToken, `/api/orders/${order.id}/refund-request`, {});
    expect(second.body.amountPaise).toBe(118000 - 39333);
    const admin = await authToken(await seedSuperAdmin());
    expect((await authPost(admin, `/api/refunds/${second.body.id}/decide`, { decision: 'APPROVED' })).status).toBe(200);

    const all = await sumBy({ orderId: order.id });
    expect(all.total).toBe(0);
    expect(all.by).toEqual({ MEMBER_PAID: 0, PLATFORM_COMMISSION: 0, GST_PAYABLE: 0, GYM_PAYABLE: 0 });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('REFUNDED');
    expect((await authPost(memberToken, `/api/orders/${order.id}/refund-request`, {})).status).toBe(400);
    // The order started this membership, so the full refund cancels it.
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: order.membershipId! } })).status).toBe('CANCELLED');
  });

  it('lets only one of two racing approvals through when together they exceed the order', async () => {
    const { order, ownerToken } = await paidOrder();
    mockRefund();
    const [a, b] = await Promise.all(
      [70000, 70000].map((amountPaise) => prisma.refund.create({ data: { orderId: order.id, amountPaise } })),
    );
    const results = await Promise.all(
      [a!, b!].map((r) => authPost(ownerToken, `/api/refunds/${r.id}/decide`, { decision: 'APPROVED' })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(await prisma.refund.count({ where: { orderId: order.id, status: 'PROCESSED' } })).toBe(1);
    const refunded = await sumBy({ sourceType: 'REFUND', orderId: order.id });
    expect(refunded.by.MEMBER_PAID).toBe(70000);
  });

  it('takes the added days back off when a fully refunded order had extended a membership', async () => {
    enablePayments();
    const { user: owner, gym } = await seedAdmin();
    const plan = await seedPlan(gym.id, { price: 1000, duration: 30 });
    const { user, details } = await seedMember(gym.id);
    const oldEnd = new Date(Date.now() + 10 * DAY);
    const current = await prisma.membership.create({
      data: { memberId: details.id, gymId: gym.id, planId: plan.id, startDate: new Date(), endDate: oldEnd, originalAmount: 1000, finalAmount: 1000, status: 'ACTIVE', paymentStatus: 'PAID' },
    });
    vi.spyOn(getRazorpay().orders, 'create').mockResolvedValue({ id: 'order_extend1' } as any);
    const memberToken = await authToken(user);
    const { body: checkout } = await authPost(memberToken, '/api/orders', { gymId: gym.id, planId: plan.id }).set('Idempotency-Key', 'ext');
    await sendWebhook({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_extend1', order_id: 'order_extend1', amount: checkout.amount } } } }, 'evt_extend1');
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: current.id } })).endDate.getTime()).toBe(oldEnd.getTime() + 30 * DAY);

    mockRefund();
    const { body: request } = await authPost(memberToken, `/api/orders/${checkout.id}/refund-request`, {});
    expect((await authPost(await authToken(owner), `/api/refunds/${request.id}/decide`, { decision: 'APPROVED' })).status).toBe(200);
    const after = await prisma.membership.findUniqueOrThrow({ where: { id: current.id } });
    expect(after).toMatchObject({ status: 'ACTIVE' });
    expect(after.endDate.getTime()).toBe(oldEnd.getTime());
  });

  it('rejects without touching the ledger, and keeps other owners out', async () => {
    const { order, memberToken, ownerToken } = await paidOrder();
    const { body: request } = await authPost(memberToken, `/api/orders/${order.id}/refund-request`, { amountPaise: 1000 });

    const stranger = await authToken((await seedAdmin()).user);
    expect((await authPost(stranger, `/api/refunds/${request.id}/decide`, { decision: 'APPROVED' })).status).toBe(403);

    const rejected = await authPost(ownerToken, `/api/refunds/${request.id}/decide`, { decision: 'REJECTED' });
    expect(rejected.body.status).toBe('REJECTED');
    expect((await authPost(ownerToken, `/api/refunds/${request.id}/decide`, { decision: 'APPROVED' })).status).toBe(409);
    expect(await prisma.ledgerEntry.count({ where: { sourceType: 'REFUND' } })).toBe(0);
  });

  it('holds an uncertain refund without allowing a second provider request', async () => {
    const { order, memberToken, ownerToken } = await paidOrder();
    const { body: request } = await authPost(memberToken, `/api/orders/${order.id}/refund-request`, {});
    expect((await authPost(memberToken, `/api/orders/${order.id}/refund-request`, { amountPaise: 999999 })).status).toBe(409);

    const provider = vi.spyOn(getRazorpay().payments, 'refund').mockRejectedValue(new Error('gateway timeout'));
    const failed = await authPost(ownerToken, `/api/refunds/${request.id}/decide`, { decision: 'APPROVED' });
    expect(failed.status).toBe(502);
    expect(failed.body.code).toBe('REFUND_OUTCOME_UNKNOWN');
    expect((await prisma.refund.findUniqueOrThrow({ where: { id: request.id } })).status).toBe('PROCESSING');
    expect((await authPost(ownerToken, `/api/refunds/${request.id}/decide`, { decision: 'APPROVED' })).status).toBe(409);
    expect(provider).toHaveBeenCalledTimes(1);

    delete process.env.RAZORPAY_KEY_ID;
    const disabled = await authPost(ownerToken, `/api/refunds/${request.id}/decide`, { decision: 'APPROVED' });
    expect(disabled.status).toBe(503);
    expect(disabled.body.code).toBe('PAYMENTS_DISABLED');
    expect(await prisma.ledgerEntry.count({ where: { sourceType: 'REFUND' } })).toBe(0);
  });
});

describe('Payouts', () => {
  const holdPassed = (gymId: string) =>
    prisma.ledgerEntry.updateMany({ where: { gymId }, data: { createdAt: new Date(Date.now() - 8 * DAY) } });

  const linkAccount = async (gymId: string) => {
    const admin = await authToken(await seedSuperAdmin());
    const res = await authPut(admin, `/api/admin/gyms/${gymId}/payout-account`, { razorpayAccountId: 'acc_TestGym123', status: 'ACTIVE' });
    expect(res.status).toBe(200);
  };

  const mockTransfer = (status = 'pending') =>
    vi.spyOn(getRazorpay().transfers, 'create').mockImplementation(async () => ({ id: `trf_${crypto.randomUUID().slice(0, 8)}`, status }) as any);

  it('stays off without RAZORPAY_ROUTE_ENABLED', async () => {
    const { gym } = await paidOrder();
    await holdPassed(gym.id);
    await linkAccount(gym.id);
    const transfer = mockTransfer();
    expect(await runPayouts()).toEqual({ created: 0, failed: 0 });
    expect(transfer).not.toHaveBeenCalled();
    await scheduleMoneyJobs();
    expect(await prisma.job.count({ where: { type: 'PAYOUTS' } })).toBe(0);
  });

  it('pays out what is past the hold, once, and books it when the transfer is processed', async () => {
    const { gym, ownerToken } = await paidOrder();
    process.env.RAZORPAY_ROUTE_ENABLED = 'true';
    await linkAccount(gym.id);
    const transfer = mockTransfer();

    expect((await runPayouts()).created).toBe(0); // still on hold
    await holdPassed(gym.id);

    expect((await runPayouts()).created).toBe(1);
    expect((await runPayouts()).created).toBe(0); // the first is still processing
    expect(transfer).toHaveBeenCalledTimes(1);
    expect(transfer.mock.calls[0]![0]).toMatchObject({ account: 'acc_TestGym123', amount: 106200, currency: 'INR' });

    const payout = await prisma.payout.findFirstOrThrow({ where: { gymId: gym.id } });
    expect(payout).toMatchObject({ status: 'PROCESSING', amountPaise: 106200 });

    const event = { event: 'transfer.processed', payload: { transfer: { entity: { id: payout.razorpayTransferId } } } };
    await sendWebhook(event, 'evt_trf1');
    await sendWebhook(event, 'evt_trf2');
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: payout.id } })).status).toBe('PAID');
    expect(await prisma.ledgerEntry.count({ where: { account: 'PAYOUT' } })).toBe(1);

    const earnings = await authGet(ownerToken, '/api/owner/earnings');
    expect(earnings.body).toMatchObject({ payablePaise: 106200, balancePaise: 0, availablePaise: 0 });
    expect(earnings.body.payouts).toHaveLength(1);
    expect((await runPayouts()).created).toBe(0);
  });

  it('skips amounts under the minimum and counts a refund at once', async () => {
    const { gym, order, memberToken, ownerToken } = await paidOrder();
    process.env.RAZORPAY_ROUTE_ENABLED = 'true';
    await linkAccount(gym.id);
    await holdPassed(gym.id);
    mockTransfer();
    mockRefund();

    // Refund all but Rs 500 of the gym's share: 106200 - 60000 = 46200 left, under the minimum.
    const { body: request } = await authPost(memberToken, `/api/orders/${order.id}/refund-request`, { amountPaise: 66667 });
    await authPost(ownerToken, `/api/refunds/${request.id}/decide`, { decision: 'APPROVED' });
    const earnings = await authGet(ownerToken, '/api/owner/earnings');
    expect(earnings.body.availablePaise).toBeLessThan(50000);
    expect(earnings.body.refunds[0]).toMatchObject({ id: request.id, status: 'PROCESSED' });
    expect((await runPayouts()).created).toBe(0);
  });

  it('notifies the owner and admins once when a transfer fails, even if the webhook repeats', async () => {
    const { gym, owner } = await paidOrder();
    process.env.RAZORPAY_ROUTE_ENABLED = 'true';
    await linkAccount(gym.id);
    await holdPassed(gym.id);
    mockTransfer();
    await runPayouts();
    const payout = await prisma.payout.findFirstOrThrow({ where: { gymId: gym.id } });

    const event = { event: 'transfer.failed', payload: { transfer: { entity: { id: payout.razorpayTransferId, error: { description: 'Beneficiary bank down' } } } } };
    await sendWebhook(event, 'evt_fail1');
    await sendWebhook(event, 'evt_fail2');

    expect(await prisma.payout.findUniqueOrThrow({ where: { id: payout.id } })).toMatchObject({ status: 'FAILED', failureReason: 'Beneficiary bank down' });
    expect(await prisma.notification.count({ where: { title: 'Payout failed', userId: owner.id } })).toBe(1);
    const admins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
    expect(await prisma.notification.count({ where: { title: 'Payout failed', userId: { in: admins.map((a) => a.id) } } })).toBe(admins.length);
  });

  it('holds an uncertain transfer and prevents a second transfer', async () => {
    const { gym } = await paidOrder();
    process.env.RAZORPAY_ROUTE_ENABLED = 'true';
    await linkAccount(gym.id);
    await holdPassed(gym.id);

    const transfer = vi.spyOn(getRazorpay().transfers, 'create').mockRejectedValueOnce(new Error('gateway timeout'));
    expect(await runPayouts()).toEqual({ created: 1, failed: 1 });
    expect(await prisma.payout.findFirstOrThrow({ where: { gymId: gym.id } })).toMatchObject({ status: 'PROCESSING', failureReason: 'Transfer outcome unknown; reconciliation required' });
    expect(await runPayouts()).toEqual({ created: 0, failed: 0 });
    expect(transfer).toHaveBeenCalledTimes(1);

    const admin = await authToken(await seedSuperAdmin());
    expect((await authGet(admin, '/api/admin/payouts')).body).toHaveLength(1);
  });

  it('creates only one transfer when payout jobs run concurrently', async () => {
    const { gym } = await paidOrder();
    process.env.RAZORPAY_ROUTE_ENABLED = 'true';
    await linkAccount(gym.id);
    await holdPassed(gym.id);
    const transfer = mockTransfer();
    await Promise.all([runPayouts(), runPayouts()]);
    expect(transfer).toHaveBeenCalledTimes(1);
    expect(await prisma.payout.count({ where: { gymId: gym.id } })).toBe(1);
  });

  it('runs from the job queue once scheduled', async () => {
    const { gym } = await paidOrder();
    process.env.RAZORPAY_ROUTE_ENABLED = 'true';
    await linkAccount(gym.id);
    await holdPassed(gym.id);
    mockTransfer('processed');
    vi.spyOn(getRazorpay().payments, 'all').mockResolvedValue({ items: [] } as any);
    vi.spyOn(getRazorpay().refunds, 'all').mockResolvedValue({ items: [] } as any);
    vi.spyOn(getRazorpay().transfers, 'all').mockResolvedValue({ items: [] } as any);

    await scheduleMoneyJobs();
    await scheduleMoneyJobs();
    expect(await prisma.job.count({ where: { type: { in: ['PAYOUTS', 'RECONCILE'] } } })).toBe(2);
    expect((await runJobs()).done).toBe(2);
    expect(await prisma.payout.count({ where: { gymId: gym.id, status: 'PAID' } })).toBe(1);
  });
});

describe('Reconciliation', () => {
  it('checks captured payments after the first provider page', async () => {
    const { order } = await paidOrder();
    const items = [
      ...Array.from({ length: 100 }, (_, i) => ({ id: `pay_unrelated_${i}`, status: 'captured', order_id: null, amount: 100 })),
      { id: order.razorpayPaymentId, status: 'captured', order_id: order.razorpayOrderId, amount: order.totalPaise },
    ];
    const payments = vi.spyOn(getRazorpay().payments, 'all').mockImplementation(async (params: any) => ({ items: items.slice(params.skip, params.skip + params.count) }) as any);
    vi.spyOn(getRazorpay().refunds, 'all').mockResolvedValue({ items: [] } as any);
    vi.spyOn(getRazorpay().transfers, 'all').mockResolvedValue({ items: [] } as any);
    expect(await runReconciliation()).toEqual({ issues: 0 });
    expect(payments).toHaveBeenCalledTimes(2);
  });

  it('lists what disagrees with Razorpay and does not fix it', async () => {
    const { order } = await paidOrder();
    // An order Razorpay captured that we never marked paid.
    const { order: stuck } = await paidOrder();
    await prisma.order.update({ where: { id: stuck.id }, data: { status: 'CREATED', paidAt: null } });

    vi.spyOn(getRazorpay().payments, 'all').mockResolvedValue({
      items: [{ id: 'pay_elsewhere', status: 'captured', order_id: stuck.razorpayOrderId, amount: stuck.totalPaise }],
    } as any);
    vi.spyOn(getRazorpay().refunds, 'all').mockResolvedValue({ items: [] } as any);
    vi.spyOn(getRazorpay().transfers, 'all').mockResolvedValue({ items: [] } as any);

    expect(await runReconciliation()).toEqual({ issues: 2 });
    expect(await runReconciliation()).toEqual({ issues: 0 }); // already listed

    const admin = await authToken(await seedSuperAdmin());
    const list = await authGet(admin, '/api/admin/reconciliation');
    expect(list.body.map((i: { kind: string; ref: string }) => `${i.kind}:${i.ref}`).sort()).toEqual(
      [`CAPTURED_NOT_PAID:pay_elsewhere`, `PAID_NOT_CAPTURED:${order.id}`].sort(),
    );
    expect((await prisma.order.findUniqueOrThrow({ where: { id: stuck.id } })).status).toBe('CREATED');
  });
});
