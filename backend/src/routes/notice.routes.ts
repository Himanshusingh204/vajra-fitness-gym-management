import { Router, Request, Response, NextFunction } from 'express';
import {
  getGymNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  getMyGymNotices,
} from '../controllers/notice.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { noticeSchema, updateNoticeSchema } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Members / trainers / staff see their own gym's announcements.
router.get('/my', authenticate, asyncHandler(getMyGymNotices));

// Gym Admin / Super Admin manage announcements for a gym.
router.get('/gym/:gymId', authenticate, asyncHandler(getGymNotices));
router.post('/gym/:gymId', authenticate, validate(noticeSchema), asyncHandler(createNotice));
router.put('/:id', authenticate, validate(updateNoticeSchema), asyncHandler(updateNotice));
router.delete('/:id', authenticate, asyncHandler(deleteNotice));

export default router;
