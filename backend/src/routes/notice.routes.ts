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
import { noticeSchema, updateNoticeSchema, gymIdParams, idParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Members / trainers / staff see their own gym's announcements.
router.get('/my', authenticate, asyncHandler(getMyGymNotices));

// Gym Admin / Super Admin manage announcements for a gym.
router.get('/gym/:gymId', authenticate, validate(gymIdParams, ['params']), asyncHandler(getGymNotices));
router.post('/gym/:gymId', authenticate, validate(gymIdParams, ['params']), validate(noticeSchema), asyncHandler(createNotice));
router.put('/:id', authenticate, validate(idParams, ['params']), validate(updateNoticeSchema), asyncHandler(updateNotice));
router.delete('/:id', authenticate, validate(idParams, ['params']), asyncHandler(deleteNotice));

export default router;
