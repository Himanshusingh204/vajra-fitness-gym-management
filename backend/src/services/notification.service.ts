import { prisma } from '../utils/prisma';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export const createNotification = async (params: {
  userId: string;
  type: NotificationType | undefined;
  title: string;
  message: string;
  link: string | null | undefined;
}) => {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type ?? 'INFO',
        title: params.title,
        message: params.message,
        link: params.link ?? null,
      },
    });
  } catch {
    // Notifications must never break the main flow
    return null;
  }
};

export const notifyGymOwner = async (params: {
  gymId: string;
  type: NotificationType | undefined;
  title: string;
  message: string;
  link?: string | null;
}) => {
  try {
    const gym = await prisma.gym.findUnique({ where: { id: params.gymId }, select: { ownerId: true } });
    if (!gym) return null;
    return createNotification({
      userId: gym.ownerId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    });
  } catch {
    return null;
  }
};
