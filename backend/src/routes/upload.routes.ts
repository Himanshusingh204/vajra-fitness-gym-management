import express, { Router, Request, Response, NextFunction } from 'express';
import { uploadFile, getDownloadLink } from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadLimiter } from '../middlewares/rateLimit.middleware';
import { idParams, z } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const uploadQuery = z.object({
  kind: z.enum(['ID_PROOF', 'BUSINESS_PROOF', 'GST_CERT', 'QUALIFICATION', 'GALLERY']),
  gymId: z.string().uuid().optional(),
});

// The body is the raw file. 5 MB is the largest any kind allows; the controller applies the per-kind limit.
// shortcut: Vercel functions cap request bodies at 4.5 MB, so large PDFs need R2 presigned uploads there.
router.post(
  '/',
  authenticate,
  uploadLimiter,
  validate(uploadQuery, ['query']),
  express.raw({ type: () => true, limit: 5 * 1024 * 1024 }),
  asyncHandler(uploadFile),
);
router.get('/:id/link', authenticate, validate(idParams, ['params']), asyncHandler(getDownloadLink));

export default router;
