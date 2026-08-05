import { Router, Request, Response, NextFunction } from 'express';
import { getFees, recordFee, updateFeeStatus, getMemberFees, getFeeReceiptPDF } from '../controllers/fee.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { recordFeeSchema, updateFeeStatusSchema } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Authenticated: member self-access to their own fees
router.get('/member/:memberId', authenticate, asyncHandler(getMemberFees));

// Download a fee receipt as PDF (member self, gym owner, or Super Admin)
router.get('/:id/receipt', authenticate, asyncHandler(getFeeReceiptPDF));

// Gym-level fee routes require GYM_ADMIN role (Super Admin may also manage status)
router.use(authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']));

router.get('/gym/:gymId', asyncHandler(getFees));
router.post('/gym/:gymId', validate(recordFeeSchema), asyncHandler(recordFee));
router.put('/:id', validate(updateFeeStatusSchema), asyncHandler(updateFeeStatus));

export default router;
