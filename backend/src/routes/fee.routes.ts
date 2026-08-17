import { Router, Request, Response, NextFunction } from 'express';
import { getFees, recordFee, updateFeeStatus, deleteFee, getMemberFees, getFeeReceiptPDF } from '../controllers/fee.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { recordFeeSchema, updateFeeStatusSchema, idParams, gymIdParams, memberIdParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Authenticated: member self-access to their own fees
router.get('/member/:memberId', authenticate, validate(memberIdParams, ['params']), asyncHandler(getMemberFees));

// Download a fee receipt as PDF (member self, gym owner, or Super Admin)
router.get('/:id/receipt', authenticate, validate(idParams, ['params']), asyncHandler(getFeeReceiptPDF));

// Gym-level fee routes require GYM_ADMIN role (Super Admin may also manage status)
router.use(authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']));

router.get('/gym/:gymId', validate(gymIdParams, ['params']), asyncHandler(getFees));
router.post('/gym/:gymId', validate(gymIdParams, ['params']), validate(recordFeeSchema), asyncHandler(recordFee));
router.put('/:id', validate(idParams, ['params']), validate(updateFeeStatusSchema), asyncHandler(updateFeeStatus));
router.delete('/:id', validate(idParams, ['params']), asyncHandler(deleteFee));

export default router;
