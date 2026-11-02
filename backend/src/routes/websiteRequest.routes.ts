import { Router, Request, Response, NextFunction } from 'express';
import {
  createWebsiteRequest,
  listMyWebsiteRequests,
  listAllWebsiteRequests,
  approveWebsiteRequest,
  rejectWebsiteRequest,
} from '../controllers/websiteRequest.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { websiteRequestSchema, idParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.use(authenticate);

router.post('/', authorize(['GYM_ADMIN']), validate(websiteRequestSchema), asyncHandler(createWebsiteRequest));
router.get('/mine', authorize(['GYM_ADMIN']), asyncHandler(listMyWebsiteRequests));

router.get('/', authorize(['SUPER_ADMIN']), asyncHandler(listAllWebsiteRequests));
router.put('/:id/approve', authorize(['SUPER_ADMIN']), validate(idParams, ['params']), asyncHandler(approveWebsiteRequest));
router.put('/:id/reject', authorize(['SUPER_ADMIN']), validate(idParams, ['params']), asyncHandler(rejectWebsiteRequest));

export default router;
