import { Router, Request, Response, NextFunction } from 'express';
import { createTrainerInvite, listTrainerInvites, revokeTrainerInvite } from '../controllers/staff.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParams, trainerInviteSchema } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.use(authenticate, authorize(['GYM_ADMIN']));

router.post('/invites', validate(trainerInviteSchema), asyncHandler(createTrainerInvite));
router.get('/invites', asyncHandler(listTrainerInvites));
router.delete('/invites/:id', validate(idParams, ['params']), asyncHandler(revokeTrainerInvite));

export default router;
