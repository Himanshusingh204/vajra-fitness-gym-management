import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';

// List current user's notifications (newest first, optional pagination)
export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10) || 20));

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({ notifications, total, unreadCount, page, pageSize });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark a single notification as read
export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const id = req.params.id as string;
    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

// Mark all current user's notifications as read
export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ updated: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

// Delete a single notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const id = req.params.id as string;
    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    await prisma.notification.delete({ where: { id } });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
