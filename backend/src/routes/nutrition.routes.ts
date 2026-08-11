import { Router, Request, Response, NextFunction } from 'express';
import { getMyNutrition, createNutritionPlan, updateNutritionPlan, deleteNutritionPlan } from '../controllers/nutrition.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { nutritionPlanSchema, idParams } from '../utils/validators';

const router = Router();

const wrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.use(authenticate, authorize(['MEMBER']));

router.get('/', wrap(getMyNutrition));
router.post('/', validate(nutritionPlanSchema), wrap(createNutritionPlan));
router.put('/:id', validate(idParams, ['params']), validate(nutritionPlanSchema), wrap(updateNutritionPlan));
router.delete('/:id', validate(idParams, ['params']), wrap(deleteNutritionPlan));

export default router;