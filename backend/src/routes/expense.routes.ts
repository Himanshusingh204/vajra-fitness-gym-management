import { Router, Request, Response, NextFunction } from 'express';
import { getExpenses, recordExpense, deleteExpense, getExpenseSummary } from '../controllers/expense.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const recordExpenseSchema = z.object({
  category: z.enum(['RENT', 'ELECTRICITY', 'INTERNET', 'SALARIES', 'MAINTENANCE', 'EQUIPMENT', 'MARKETING', 'CLEANING', 'SOFTWARE', 'MISC']),
  description: z.string().trim().min(2).max(500),
  amount: z.number().positive().max(1e8),
  date: z.string().optional(),
  isRecurring: z.boolean().optional(),
  receiptUrl: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

// All expense routes require GYM_ADMIN role
router.use(authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']));

router.get('/gym/:gymId/summary', asyncHandler(getExpenseSummary));
router.get('/gym/:gymId', asyncHandler(getExpenses));
router.post('/gym/:gymId', validate(recordExpenseSchema), asyncHandler(recordExpense));
router.delete('/:id', asyncHandler(deleteExpense));

export default router;
