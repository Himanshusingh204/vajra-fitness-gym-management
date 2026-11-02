import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createOrderSchema } from '../utils/validators';
import { PaymentDisabledError } from '../services/payment.service';
import { createOrder, listMyOrders, getEarnings } from '../services/order.service';
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
