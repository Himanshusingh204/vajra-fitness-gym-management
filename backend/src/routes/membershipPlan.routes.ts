import { Router, Request, Response, NextFunction } from 'express';
import { getPlans, getAllPlans, createPlan, updatePlan, deletePlan } from '../controllers/membershipPlan.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { planSchema, updatePlanSchema } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Public route to view active plans for a gym
router.get('/gym/:gymId', asyncHandler(getPlans));

// Protected routes for Gym Admin / Super Admin
router.use(authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']));

router.get('/admin/gym/:gymId', asyncHandler(getAllPlans));
router.post('/', validate(planSchema), asyncHandler(createPlan));
router.put('/:id', validate(updatePlanSchema), asyncHandler(updatePlan));
router.delete('/:id', asyncHandler(deletePlan));

export default router;
