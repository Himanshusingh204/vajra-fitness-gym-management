import { Router, Request, Response, NextFunction } from 'express';
import { getPlans, getAllPlans, createPlan, updatePlan, deletePlan } from '../controllers/membershipPlan.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { planSchema, updatePlanSchema, gymIdParams, idParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Public route to view active plans for a gym
router.get('/gym/:gymId', validate(gymIdParams, ['params']), asyncHandler(getPlans));

// Protected routes for Gym Admin / Super Admin
router.use(authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']));

router.get('/admin/gym/:gymId', validate(gymIdParams, ['params']), asyncHandler(getAllPlans));
router.post('/', validate(planSchema), asyncHandler(createPlan));
router.put('/:id', validate(idParams, ['params']), validate(updatePlanSchema), asyncHandler(updatePlan));
router.delete('/:id', validate(idParams, ['params']), asyncHandler(deletePlan));

export default router;
