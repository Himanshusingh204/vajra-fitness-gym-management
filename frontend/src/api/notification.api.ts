import api from '../services/api';

export interface AppNotification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

export const getMyNotifications = async (params?: { page?: number; limit?: number }) => {
  const response = await api.get<NotificationsResponse>('/notifications', { params });
  return response.data;
};

export const markNotificationRead = async (id: string) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (id: string) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};
