import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { checkoutSchema, verifyPaymentSchema, refundPaymentSchema } from '../utils/validators';
import { getPaymentConfig, createPaymentOrder, verifyPayment, handleWebhook, refundFeePayment, PaymentDisabledError } from '../services/payment.service';
import type { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Public: whether online payments are enabled and the public Razorpay key id.
router.get('/config', (_req, res) => {
  res.json(getPaymentConfig());
});

// Member: create a Razorpay order for one of their pending fees.
router.post('/checkout', authenticate, validate(checkoutSchema), async (req: AuthRequest, res) => {
  try {
    const result = await createPaymentOrder({ feeId: req.body.feeId, userId: req.user!.userId });
    res.json(result);
  } catch (err: any) {
    if (err instanceof PaymentDisabledError) {
      return res.status(503).json({ error: 'ONLINE_PAYMENTS_DISABLED' });
    }
    const message = err?.message ?? '';
    if (message === 'FEE_NOT_FOUND') return res.status(404).json({ error: 'Fee not found' });
    if (message === 'FEE_NOT_OWNED') return res.status(403).json({ error: 'You can only pay for your own fees' });
    if (message === 'FEE_ALREADY_PAID') return res.status(400).json({ error: 'This fee is already paid' });
    if (message === 'FEE_AMOUNT_INVALID') return res.status(400).json({ error: 'Invalid fee amount' });
    console.error('[Payments] checkout failed', err);
    res.status(502).json({ error: 'Failed to create payment order' });
  }
});

// Member: verify the checkout signature and settle the fee.
router.post('/verify', authenticate, validate(verifyPaymentSchema), async (req: AuthRequest, res) => {
  try {
    const result = await verifyPayment({ ...req.body, userId: req.user!.userId });
    res.json(result);
  } catch (err: any) {
    const message = err?.message ?? '';
    if (message === 'INVALID_SIGNATURE') return res.status(400).json({ error: 'Payment verification failed' });
    if (message === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Order not found' });
    if (message === 'ORDER_NOT_OWNED') return res.status(403).json({ error: 'You can only verify your own payments' });
    if (message === 'FEE_NOT_FOUND') return res.status(404).json({ error: 'Fee not found' });
    console.error('[Payments] verify failed', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Gym owner / Super Admin: refund a fee that was captured online. Reverses
// real money at Razorpay — not a self-service member action.
router.post('/refund', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(refundPaymentSchema), async (req: AuthRequest, res) => {
  try {
    const result = await refundFeePayment({
      feeId: req.body.feeId,
      requesterId: req.user!.userId,
      requesterRole: req.user!.role,
      amount: req.body.amount,
      reason: req.body.reason,
    });
    res.json(result);
  } catch (err: any) {
    if (err instanceof PaymentDisabledError) {
      return res.status(503).json({ error: 'ONLINE_PAYMENTS_DISABLED' });
    }
    const message = err?.message ?? '';
    if (message === 'FEE_NOT_FOUND') return res.status(404).json({ error: 'Fee not found' });
    if (message === 'UNAUTHORIZED') return res.status(403).json({ error: 'You can only refund fees for your own gym' });
    if (message === 'FEE_NOT_REFUNDABLE') return res.status(400).json({ error: 'This fee was not paid via an online payment and cannot be refunded here' });
    if (message === 'REFUND_AMOUNT_INVALID') return res.status(400).json({ error: 'Refund amount must be greater than zero and not exceed the original payment' });
    console.error('[Payments] refund failed', err);
    res.status(502).json({ error: 'Failed to process refund' });
  }
});

// Razorpay webhook — body arrives as a raw Buffer (express.raw) so the signature
// can be checked against the exact payload that was signed.
router.post('/webhook', async (req, res) => {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) ?? '';
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    const result = await handleWebhook(rawBody, signature);
    res.json(result);
  } catch (err: any) {
    const message = err?.message ?? '';
    if (message === 'INVALID_WEBHOOK_SIGNATURE' || message === 'WEBHOOK_SECRET_MISSING') {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    console.error('[Payments] webhook failed', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
