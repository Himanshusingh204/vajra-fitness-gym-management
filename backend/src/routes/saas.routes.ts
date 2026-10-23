import { Router, Request, Response, NextFunction } from 'express';
import {
  getSaaSPlans,
  createSaaSPlan,
  updateSaaSPlan,
  deleteSaaSPlan,
  getSubscriptions,
  createSubscription,
  updateSubscriptionStatus,
  getMyGymSubscription,
  purchaseSubscription,
  checkoutSubscription,
  verifySaaS,
  extendSubscriptionHandler,
  cancelSubscriptionHandler,
  upgradeSubscriptionHandler,
  downgradeSubscriptionHandler,
  getInvoices,
  generateInvoiceHandler,
} from '../controllers/saas.controller';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { saasPlanSchema, saasPlanUpdateSchema, subscriptionSchema, subscriptionStatusSchema, subscriptionPurchaseSchema, verifyPaymentSchema, idParams, extendSubscriptionSchema, cancelSubscriptionSchema, subscriptionChangePlanSchema, generateInvoiceSchema } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Public: list active SaaS plans. `?all=true` requires Super Admin.
const plansAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.query.all === 'true') {
    return authenticate(req as AuthRequest, res, (err?: unknown) => {
      if (err) return next(err);
      authorize(['SUPER_ADMIN'])(req as AuthRequest, res, next);
    });
  }
  next();
};

router.get('/plans', plansAuth, asyncHandler(getSaaSPlans));

// Gym Admin: own gym subscription summary
router.get('/my-subscription', authenticate, authorize(['GYM_ADMIN']), asyncHandler(getMyGymSubscription));

// Gym Admin: purchase a SaaS plan
router.post('/purchase', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(subscriptionPurchaseSchema), asyncHandler(purchaseSubscription));

// Gym Admin: start Razorpay checkout
router.post('/checkout', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(subscriptionPurchaseSchema), asyncHandler(checkoutSubscription));

// Gym Admin: verify Razorpay payment
router.post('/verify', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(verifyPaymentSchema), asyncHandler(verifySaaS));

// Super Admin: move a gym to another plan without payment. Gym admins change
// plans through checkout so a new plan is only active once it is paid.
router.post('/upgrade', authenticate, authorize(['SUPER_ADMIN']), validate(subscriptionChangePlanSchema), asyncHandler(upgradeSubscriptionHandler));
router.post('/downgrade', authenticate, authorize(['SUPER_ADMIN']), validate(subscriptionChangePlanSchema), asyncHandler(downgradeSubscriptionHandler));

// Gym Admin: view invoices
router.get('/invoices', authenticate, authorize(['GYM_ADMIN']), asyncHandler(getInvoices));

// Super Admin: plan management
router.post('/plans', authenticate, authorize(['SUPER_ADMIN']), validate(saasPlanSchema), asyncHandler(createSaaSPlan));
router.put('/plans/:id', authenticate, authorize(['SUPER_ADMIN']), validate(idParams, ['params']), validate(saasPlanUpdateSchema), asyncHandler(updateSaaSPlan));
router.delete('/plans/:id', authenticate, authorize(['SUPER_ADMIN']), validate(idParams, ['params']), asyncHandler(deleteSaaSPlan));

// Super Admin: subscription management
router.get('/subscriptions', authenticate, authorize(['SUPER_ADMIN']), asyncHandler(getSubscriptions));
router.post('/subscriptions', authenticate, authorize(['SUPER_ADMIN']), validate(subscriptionSchema), asyncHandler(createSubscription));
router.patch('/subscriptions/:id', authenticate, authorize(['SUPER_ADMIN']), validate(idParams, ['params']), validate(subscriptionStatusSchema), asyncHandler(updateSubscriptionStatus));

// Super Admin: extend / cancel subscription
router.post('/subscriptions/:id/extend', authenticate, authorize(['SUPER_ADMIN']), validate(idParams, ['params']), validate(extendSubscriptionSchema), asyncHandler(extendSubscriptionHandler));
router.post('/subscriptions/:id/cancel', authenticate, authorize(['SUPER_ADMIN']), validate(idParams, ['params']), validate(cancelSubscriptionSchema), asyncHandler(cancelSubscriptionHandler));

// Super Admin: generate invoice
router.post('/invoices/generate', authenticate, authorize(['SUPER_ADMIN']), validate(generateInvoiceSchema), asyncHandler(generateInvoiceHandler));

// Super Admin: view all invoices
router.get('/invoices/all', authenticate, authorize(['SUPER_ADMIN']), asyncHandler(getInvoices));

export default router;
