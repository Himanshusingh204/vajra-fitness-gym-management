import { Router, Request, Response, NextFunction } from 'express';
import { getAttendance, markAttendance, getMyAttendance } from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { markAttendanceSchema, gymIdParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Member self-service: their own attendance history
router.get('/my', authenticate, authorize(['MEMBER']), asyncHandler(getMyAttendance));

// Gym admin / staff: view & mark attendance (staff verified against gym in controller)
router.use(authenticate, authorize(['GYM_ADMIN', 'STAFF', 'SUPER_ADMIN']));

router.get('/gym/:gymId', validate(gymIdParams, ['params']), asyncHandler(getAttendance));
router.post('/gym/:gymId', validate(gymIdParams, ['params']), validate(markAttendanceSchema), asyncHandler(markAttendance));

export default router;
