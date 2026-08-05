import { Router, Request, Response, NextFunction } from 'express';
import { addProgress, getMyProgress } from '../controllers/progress.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { progressSchema } from '../utils/validators';

const router = Router();

const wrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.use(authenticate, authorize(['MEMBER']));

router.post('/', validate(progressSchema), wrap(addProgress));
router.get('/my', wrap(getMyProgress));

export default router;