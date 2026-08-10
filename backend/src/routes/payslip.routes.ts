import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { getPayslips, createPayslip, updatePayslipStatus, deletePayslip, getPayslipSummary, getMyPayslips } from '../controllers/payslip.controller';

// =====================================================================
// PAYSLIP ROUTES (Payroll for staff & trainers)
// - Gym scoped: GYM_ADMIN (super admins pass through the controller).
// - Self-scoped: STAFF / TRAINER / MEMBER view only their own payslips.
// =====================================================================

const router = Router();

router.use(authenticate);

router.get('/gym/:gymId', authorize(['GYM_ADMIN', 'SUPER_ADMIN']), getPayslips);
router.get('/gym/:gymId/summary', authorize(['GYM_ADMIN', 'SUPER_ADMIN']), getPayslipSummary);
router.post('/gym/:gymId', authorize(['GYM_ADMIN', 'SUPER_ADMIN']), createPayslip);
router.put('/:id', authorize(['GYM_ADMIN', 'SUPER_ADMIN']), updatePayslipStatus);
router.delete('/:id', authorize(['GYM_ADMIN', 'SUPER_ADMIN']), deletePayslip);
router.get('/my', getMyPayslips);

export default router;
