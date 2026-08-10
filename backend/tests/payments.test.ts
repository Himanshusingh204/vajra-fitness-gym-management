import { describe, it, expect, afterEach } from 'vitest';
import crypto from 'crypto';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedMember, login, authPost, authGet } from './helpers';
import { toPaise, verifyRazorpaySignature } from '../src/services/payment.service';

// Ensure online payments are in a known (disabled) state unless a test opts in.
afterEach(() => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
});

const sign = (payload: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

describe('Razorpay payments', () => {
  it('reports online payments as disabled when no keys are configured', async () => {
    const res = await authGet('', '/api/payments/config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: false, keyId: null });
  });

  it('reports online payments as enabled when keys are configured', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_keyid';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
    const res = await authGet('', '/api/payments/config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: true, keyId: 'rzp_test_keyid' });
  });

  it('returns 401 for checkout without authentication', async () => {
    const res = await authPost('', '/api/payments/checkout', { feeId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(401);
  });

  it('returns 503 ONLINE_PAYMENTS_DISABLED for checkout when keys are missing', async () => {
    const { user: admin, gym } = await seedAdmin();
    const { details: member } = await seedMember(gym.id);
    const fee = await prisma.fee.create({
      data: { memberId: member.id, gymId: gym.id, amount: 1500, dueDate: new Date(), status: 'PENDING' },
    });
    const token = await login(admin.email).then((r) => r.body.token as string);
    const res = await authPost(token, '/api/payments/checkout', { feeId: fee.id });
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('ONLINE_PAYMENTS_DISABLED');
  });

  it('verifies and settles a payment end-to-end (offline)', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_keyid';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';

    const { user: admin, gym } = await seedAdmin();
    const { user: memberUser, details: member } = await seedMember(gym.id);
    const plan = await prisma.membershipPlan.create({
      data: { gymId: gym.id, name: 'Annual', price: 12000, duration: 365 },
    });
    const membership = await prisma.membership.create({
      data: {
        memberId: member.id,
        gymId: gym.id,
        planId: plan.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 86400000),
        originalAmount: 12000,
        discount: 0,
        finalAmount: 12000,
        paymentStatus: 'PENDING',
        status: 'ACTIVE',
      },
    });
    const fee = await prisma.fee.create({
      data: {
        memberId: member.id,
        gymId: gym.id,
        membershipId: membership.id,
        amount: 12000,
        dueDate: new Date(),
        status: 'PENDING',
      },
    });

    const orderId = 'order_AB12cd34ef56';
    const paymentId = 'pay_gh78ij90kl12';
    await prisma.paymentOrder.create({
      data: { orderId, amount: toPaise(12000), currency: 'INR', status: 'CREATED', feeId: fee.id },
    });

    const token = await login(memberUser.email).then((r) => r.body.token as string);
    const res = await authPost(token, '/api/payments/verify', {
      orderId,
      paymentId,
      signature: sign(`${orderId}|${paymentId}`, 'rzp_test_secret'),
    });

    expect(res.status).toBe(200);
    const settledFee = await prisma.fee.findUniqueOrThrow({ where: { id: fee.id } });
    expect(settledFee.status).toBe('PAID');
    expect(settledFee.paymentMethod).toBe('ONLINE');
    expect(settledFee.transactionId).toBe(paymentId);

    const settledMembership = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(settledMembership.paymentStatus).toBe('PAID');

    const order = await prisma.paymentOrder.findUniqueOrThrow({ where: { orderId } });
    expect(order.status).toBe('PAID');
    expect(order.paymentId).toBe(paymentId);
  });

  it('rejects verify when the signature is invalid', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_keyid';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';

    const { user: admin, gym } = await seedAdmin();
    const { user: memberUser, details: member } = await seedMember(gym.id);
    const fee = await prisma.fee.create({
      data: { memberId: member.id, gymId: gym.id, amount: 1500, dueDate: new Date(), status: 'PENDING' },
    });
    await prisma.paymentOrder.create({
      data: { orderId: 'order_bad0sig', amount: 150000, currency: 'INR', status: 'CREATED', feeId: fee.id },
    });

    const token = await login(memberUser.email).then((r) => r.body.token as string);
    const res = await authPost(token, '/api/payments/verify', {
      orderId: 'order_bad0sig',
      paymentId: 'pay_0000000000',
      signature: '0'.repeat(64),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('verification failed');
  });

  it('rejects a member verifying another member order', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_keyid';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';

    const { gym } = await seedAdmin();
    const { user: ownerOfFee } = await seedMember(gym.id);
    const { user: otherMember, details: otherDetails } = await seedMember(gym.id);
    const fee = await prisma.fee.create({
      data: { memberId: otherDetails.id, gymId: gym.id, amount: 1500, dueDate: new Date(), status: 'PENDING' },
    });
    const orderId = 'order_own1234567';
    const paymentId = 'pay_own123456789';
    await prisma.paymentOrder.create({
      data: { orderId, amount: 150000, currency: 'INR', status: 'CREATED', feeId: fee.id },
    });

    const token = await login(ownerOfFee.email).then((r) => r.body.token as string);
    const res = await authPost(token, '/api/payments/verify', {
      orderId,
      paymentId,
      signature: sign(`${orderId}|${paymentId}`, 'rzp_test_secret'),
    });
    expect(res.status).toBe(403);
  });

  it('rejects a webhook without a webhook secret', async () => {
    const res = await authPost('', '/api/payments/webhook', { event: 'payment.captured' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid webhook signature');
  });

  it('rejects a webhook with an invalid signature', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
    const payload = JSON.stringify({ event: 'payment.captured' });
    const res = await authPost('', '/api/payments/webhook', JSON.parse(payload))
      .set('x-razorpay-signature', '0'.repeat(64));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid webhook signature');
  });

  it('processes a valid payment.captured webhook', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_keyid';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';

    const { user: admin, gym } = await seedAdmin();
    const { details: member } = await seedMember(gym.id);
    const fee = await prisma.fee.create({
      data: { memberId: member.id, gymId: gym.id, amount: 1500, dueDate: new Date(), status: 'PENDING' },
    });
    await prisma.paymentOrder.create({
      data: { orderId: 'order_wh1234567', amount: 150000, currency: 'INR', status: 'CREATED', feeId: fee.id },
    });

    const orderId = 'order_wh1234567';
    const paymentId = 'pay_wh123456789';
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: 150000 } } },
    });
    const signature = sign(payload, 'whsec_test');

    const res = await authPost('', '/api/payments/webhook', JSON.parse(payload))
      .set('x-razorpay-signature', signature);

    expect(res.status).toBe(200);
    const settledFee = await prisma.fee.findUniqueOrThrow({ where: { id: fee.id } });
    expect(settledFee.status).toBe('PAID');
    expect(settledFee.transactionId).toBe(paymentId);
  });

  it('verifies the checkout signature helper', () => {
    const secret = 'my-secret';
    const payload = 'order_1|pay_1';
    expect(verifyRazorpaySignature(payload, sign(payload, secret), secret)).toBe(true);
    expect(verifyRazorpaySignature(payload, sign(payload, 'wrong'), secret)).toBe(false);
    expect(verifyRazorpaySignature(payload, 'deadbeef', secret)).toBe(false);
  });
});
