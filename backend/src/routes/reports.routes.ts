import { Router, Request, Response, NextFunction } from 'express';
import { revenueReport, gymStats, gymAnalytics } from '../controllers/reports.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/gym/:gymId/stats', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), asyncHandler(gymStats));
router.get('/gym/:gymId/analytics', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), asyncHandler(gymAnalytics));
router.get('/gym/:gymId/revenue', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), asyncHandler(revenueReport));

export default router;
