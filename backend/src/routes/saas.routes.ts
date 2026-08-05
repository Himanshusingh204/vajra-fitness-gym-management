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
} from '../controllers/saas.controller';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { saasPlanSchema, saasPlanUpdateSchema, subscriptionSchema, subscriptionStatusSchema } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Public: list active SaaS plans. Requesting `?all=true` (including deactivated plans)
// requires a Super Admin, so inactive plan details are never exposed publicly.
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

// Gym Admin: own gym subscription
router.get('/my-subscription', authenticate, authorize(['GYM_ADMIN']), asyncHandler(getMyGymSubscription));

// Super Admin: plan management
router.post('/plans', authenticate, authorize(['SUPER_ADMIN']), validate(saasPlanSchema), asyncHandler(createSaaSPlan));
router.put('/plans/:id', authenticate, authorize(['SUPER_ADMIN']), validate(saasPlanUpdateSchema), asyncHandler(updateSaaSPlan));
router.delete('/plans/:id', authenticate, authorize(['SUPER_ADMIN']), asyncHandler(deleteSaaSPlan));

// Super Admin: subscriptions
router.get('/subscriptions', authenticate, authorize(['SUPER_ADMIN']), asyncHandler(getSubscriptions));
router.post('/subscriptions', authenticate, authorize(['SUPER_ADMIN']), validate(subscriptionSchema), asyncHandler(createSubscription));
router.patch('/subscriptions/:id', authenticate, authorize(['SUPER_ADMIN']), validate(subscriptionStatusSchema), asyncHandler(updateSubscriptionStatus));

export default router;
