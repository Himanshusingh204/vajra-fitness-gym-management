import { Router, Request, Response, NextFunction } from 'express';
import {
  getMemberships,
  getMyMemberships,
  createMembershipHandler,
  renewMembershipHandler,
  getMembership,
} from '../controllers/membership.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createMembershipSchema, renewMembershipSchema, gymIdParams, idParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Member self-service
router.get('/my', authenticate, authorize(['MEMBER']), asyncHandler(getMyMemberships));

// Gym-scoped management (Gym Admin / Super Admin)
router.get('/gym/:gymId', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(gymIdParams, ['params']), asyncHandler(getMemberships));
router.post(
  '/gym/:gymId',
  authenticate,
  authorize(['GYM_ADMIN', 'SUPER_ADMIN']),
  validate(gymIdParams, ['params']),
  validate(createMembershipSchema),
  asyncHandler(createMembershipHandler),
);
router.post(
  '/gym/:gymId/renew',
  authenticate,
  authorize(['GYM_ADMIN', 'SUPER_ADMIN']),
  validate(gymIdParams, ['params']),
  validate(renewMembershipSchema),
  asyncHandler(renewMembershipHandler),
);

// Single membership (self or owning gym admin / super admin)
router.get('/:id', authenticate, validate(idParams, ['params']), asyncHandler(getMembership));

export default router;
