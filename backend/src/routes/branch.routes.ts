import { Router, Request, Response, NextFunction } from 'express';
import { getBranches, createBranch, updateBranch, deleteBranch, getPendingBranches, approveBranch, rejectBranch } from '../controllers/branch.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { branchCreateSchema, branchUpdateSchema, branchRejectSchema, gymIdParams, idParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Branch management requires a GYM_ADMIN (or SUPER_ADMIN) role.
router.use(authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']));

// Super Admin: branch approval workflow.
router.get('/pending', authorize(['SUPER_ADMIN']), asyncHandler(getPendingBranches));
router.put('/:id/approve', authorize(['SUPER_ADMIN']), validate(idParams, ['params']), asyncHandler(approveBranch));
router.put('/:id/reject', authorize(['SUPER_ADMIN']), validate(idParams, ['params']), validate(branchRejectSchema), asyncHandler(rejectBranch));

router.get('/gym/:gymId', validate(gymIdParams, ['params']), asyncHandler(getBranches));
router.post('/gym/:gymId', validate(gymIdParams, ['params']), validate(branchCreateSchema), asyncHandler(createBranch));
router.put('/:id', validate(idParams, ['params']), validate(branchUpdateSchema), asyncHandler(updateBranch));
router.delete('/:id', validate(idParams, ['params']), asyncHandler(deleteBranch));

export default router;
