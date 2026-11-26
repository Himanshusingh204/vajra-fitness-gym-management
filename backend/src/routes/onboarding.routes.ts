import { Router, Request, Response, NextFunction } from 'express';
import { getApplication, saveApplication, submitApplication, removeDocument } from '../controllers/onboarding.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParams, onboardingDraftSchema } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// The gym owner's own application. Super admins review it through /api/admin/approvals.
router.use(authenticate, authorize(['GYM_ADMIN'], { allowSuperAdmin: false }));

router.get('/gym', asyncHandler(getApplication));
router.patch('/gym', validate(onboardingDraftSchema), asyncHandler(saveApplication));
router.post('/gym/submit', asyncHandler(submitApplication));
router.delete('/documents/:id', validate(idParams, ['params']), asyncHandler(removeDocument));

export default router;
