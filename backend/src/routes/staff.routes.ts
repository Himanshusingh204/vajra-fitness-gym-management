import { Router, Request, Response, NextFunction } from 'express';
import { getStaff, addStaff, deleteStaff } from '../controllers/staff.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { staffAddSchema, gymIdParams, idParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// All these routes require GYM_ADMIN role
router.use(authenticate, authorize(['GYM_ADMIN']));

router.get('/gym/:gymId', validate(gymIdParams, ['params']), asyncHandler(getStaff));
router.post('/gym/:gymId', validate(gymIdParams, ['params']), validate(staffAddSchema), asyncHandler(addStaff));
router.delete('/:id', validate(idParams, ['params']), asyncHandler(deleteStaff));

export default router;
