import { Router, Request, Response, NextFunction } from 'express';
import { exportMembers, exportFees, exportAttendance, exportExpenses, exportBookings, exportUsers, exportGyms } from '../controllers/export.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { gymIdParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.use(authenticate);

const owner = [authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(gymIdParams, ['params'])];
router.get('/gym/:gymId/members.csv', ...owner, asyncHandler(exportMembers));
router.get('/gym/:gymId/payments.csv', ...owner, asyncHandler(exportFees));
router.get('/gym/:gymId/attendance.csv', ...owner, asyncHandler(exportAttendance));
router.get('/gym/:gymId/expenses.csv', ...owner, asyncHandler(exportExpenses));
router.get('/gym/:gymId/bookings.csv', ...owner, asyncHandler(exportBookings));

router.get('/users.csv', authorize(['SUPER_ADMIN']), asyncHandler(exportUsers));
router.get('/gyms.csv', authorize(['SUPER_ADMIN']), asyncHandler(exportGyms));

export default router;
