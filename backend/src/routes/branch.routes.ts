import { Router, Request, Response, NextFunction } from 'express';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../controllers/branch.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { branchCreateSchema, branchUpdateSchema, gymIdParams, idParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Branch management requires a GYM_ADMIN (or SUPER_ADMIN) role.
router.use(authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']));

router.get('/gym/:gymId', validate(gymIdParams, ['params']), asyncHandler(getBranches));
router.post('/gym/:gymId', validate(gymIdParams, ['params']), validate(branchCreateSchema), asyncHandler(createBranch));
router.put('/:id', validate(idParams, ['params']), validate(branchUpdateSchema), asyncHandler(updateBranch));
router.delete('/:id', validate(idParams, ['params']), asyncHandler(deleteBranch));

export default router;
