import { z } from 'zod';
import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createOrderSchema, verifyPaymentSchema, idParams } from '../utils/validators';
import { PaymentDisabledError } from '../services/payment.service';
import { createOrder, listMyOrders, getEarnings, verifyOrderPayment } from '../services/order.service';
import { requestRefund, decideRefund } from '../services/refund.service';
import { prisma } from '../utils/prisma';
import { canAccessGym } from '../utils/tenant';
import type { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Member: buy a plan through Kavach. Needs an Idempotency-Key header.
router.post('/orders', authenticate, authorize(['MEMBER']), validate(createOrderSchema), async (req: AuthRequest, res) => {
  const idempotencyKey = req.get('idempotency-key')?.trim();
  if (!idempotencyKey || idempotencyKey.length > 100) {
    return res.status(400).json({ error: 'Idempotency-Key header is required', code: 'IDEMPOTENCY_KEY_REQUIRED' });
  }
  try {
    const order = await createOrder({ ...req.body, userId: req.user!.userId, idempotencyKey });
    res.status(201).json(order);
  } catch (err: any) {
    if (err instanceof PaymentDisabledError) {
      return res.status(503).json({ error: 'ONLINE_PAYMENTS_DISABLED', code: 'PAYMENTS_DISABLED' });
    }
    const message = err?.message ?? '';
    if (message === 'PLAN_NOT_FOUND' || message === 'GYM_NOT_FOUND') return res.status(404).json({ error: 'Plan not found', code: message });
    if (message === 'PLAN_NOT_PURCHASABLE') return res.status(400).json({ error: 'This plan cannot be bought online', code: message });
    if (message === 'IDEMPOTENCY_KEY_REUSED') return res.status(422).json({ error: 'Idempotency-Key was used for a different order', code: message });
    console.error('[Orders] create failed', err);
    res.status(502).json({ error: 'Failed to create order', code: 'ORDER_FAILED' });
  }
});

// Member: Razorpay Checkout's success handler. Settles the order unless the webhook already did.
router.post('/orders/verify', authenticate, authorize(['MEMBER']), validate(verifyPaymentSchema), async (req: AuthRequest, res) => {
  try {
    res.json(await verifyOrderPayment({ ...req.body, userId: req.user!.userId }));
  } catch (err: any) {
    if (err instanceof PaymentDisabledError) {
      return res.status(503).json({ error: 'ONLINE_PAYMENTS_DISABLED', code: 'PAYMENTS_DISABLED' });
    }
    const message = err?.message ?? '';
    if (message === 'INVALID_SIGNATURE') return res.status(400).json({ error: 'Payment verification failed', code: message });
    if (message === 'AMOUNT_MISMATCH') return res.status(400).json({ error: 'Paid amount does not match the order', code: message });
    if (message === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Order not found', code: message });
    if (message === 'ORDER_NOT_OWNED') return res.status(403).json({ error: 'You can only verify your own orders', code: message });
    console.error('[Orders] verify failed', err);
    res.status(500).json({ error: 'Failed to verify payment', code: 'VERIFY_FAILED' });
  }
});

const refundRequestSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().trim().max(300).optional(),
});

const refundErrors: Record<string, [number, string]> = {
  ORDER_NOT_FOUND: [404, 'Order not found'],
  REFUND_NOT_FOUND: [404, 'Refund not found'],
  FORBIDDEN: [403, 'Access denied'],
  ORDER_NOT_REFUNDABLE: [400, 'This order cannot be refunded'],
  REFUND_PENDING: [409, 'A refund for this order is already waiting for a decision'],
  REFUND_NOT_PENDING: [409, 'This refund was already decided'],
  REFUND_OUTCOME_UNKNOWN: [502, 'Refund status is being checked. Do not retry; contact support.'],
  REFUND_AMOUNT_INVALID: [400, 'Refund amount is more than what is left on the order'],
  INVALID_AMOUNT: [400, 'Refund amount is more than what is left on the order'],
};

const sendRefundError = (res: any, err: any) => {
  if (err instanceof PaymentDisabledError) {
    return res.status(503).json({ error: 'ONLINE_PAYMENTS_DISABLED', code: 'PAYMENTS_DISABLED' });
  }
  const known = refundErrors[err?.message ?? ''];
  if (known) return res.status(known[0]).json({ error: known[1], code: err.message === 'INVALID_AMOUNT' ? 'REFUND_AMOUNT_INVALID' : err.message });
  console.error('[Refunds] failed', err);
  res.status(502).json({ error: 'Failed to process refund', code: 'REFUND_FAILED' });
};

// Member: ask for a refund on a paid order. The gym owner or an admin decides.
router.post('/orders/:id/refund-request', authenticate, authorize(['MEMBER']), validate(idParams, ['params']), validate(refundRequestSchema), async (req: AuthRequest, res) => {
  try {
    res.status(201).json(await requestRefund({ ...req.body, orderId: req.params.id as string, userId: req.user!.userId }));
  } catch (err) {
    sendRefundError(res, err);
  }
});

router.post(
  '/refunds/:id/decide',
  authenticate,
  authorize(['GYM_ADMIN', 'SUPER_ADMIN']),
  validate(idParams, ['params']),
  validate(z.object({ decision: z.enum(['APPROVED', 'REJECTED']) })),
  async (req: AuthRequest, res) => {
    try {
      res.json(await decideRefund({ refundId: req.params.id as string, decision: req.body.decision, user: req.user }));
    } catch (err) {
      sendRefundError(res, err);
    }
  },
);

router.get('/orders/mine', authenticate, async (req: AuthRequest, res) => {
  res.json(await listMyOrders(req.user!.userId));
});

// Owner: earnings across their gyms, or one gym with ?gymId=.
router.get('/owner/earnings', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const gymId = typeof req.query.gymId === 'string' ? req.query.gymId : undefined;
  if (gymId) {
    if (!(await canAccessGym(req.user, gymId))) return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
    return res.json(await getEarnings([gymId]));
  }
  const gyms = await prisma.gym.findMany({ where: { ownerId: req.user!.userId }, select: { id: true } });
  res.json(await getEarnings(gyms.map((g) => g.id)));
});

export default router;
