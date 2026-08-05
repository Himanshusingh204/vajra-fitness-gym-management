import { Router, Request, Response, NextFunction } from 'express';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/', authenticate, asyncHandler(getMyNotifications));
router.put('/read-all', authenticate, asyncHandler(markAllNotificationsRead));
router.put('/:id/read', authenticate, asyncHandler(markNotificationRead));
router.delete('/:id', authenticate, asyncHandler(deleteNotification));

export default router;
