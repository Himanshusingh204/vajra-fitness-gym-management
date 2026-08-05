import { Router, Request, Response, NextFunction } from 'express';
import { getWorkoutSlips, createWorkoutSlip, getGymWorkoutSlips, getWorkoutSlipPDF } from '../controllers/workout.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { workoutSlipSchema } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// All workout routes require basic authentication
router.use(authenticate);

router.get('/member/:memberId', asyncHandler(getWorkoutSlips));
router.post('/member/:memberId', validate(workoutSlipSchema), asyncHandler(createWorkoutSlip));

// Gym-level list (Gym Admin, Super Admin, or Trainer at that gym)
router.get('/gym/:gymId', authorize(['GYM_ADMIN', 'SUPER_ADMIN', 'TRAINER']), asyncHandler(getGymWorkoutSlips));

// Download a workout slip as PDF
router.get('/:id/pdf', asyncHandler(getWorkoutSlipPDF));

export default router;
