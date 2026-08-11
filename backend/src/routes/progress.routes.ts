import { Router, Request, Response, NextFunction } from 'express';
import { addProgress, getMyProgress, getMemberProgress } from '../controllers/progress.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { progressSchema, memberIdParams } from '../utils/validators';

const router = Router();

const wrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Trainer / Gym Admin / Super Admin: read a specific member's progress trend.
router.get(
  '/member/:memberId',
  authenticate,
  authorize(['TRAINER', 'GYM_ADMIN', 'SUPER_ADMIN']),
  validate(memberIdParams, ['params']),
  wrap(getMemberProgress)
);

router.use(authenticate, authorize(['MEMBER']));

router.post('/', validate(progressSchema), wrap(addProgress));
router.get('/my', wrap(getMyProgress));

export default router;