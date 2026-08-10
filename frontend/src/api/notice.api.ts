import api from '../services/api';

// Announcements for the current user's gym (members / trainers / staff)
export const getMyGymNotices = async () => {
  const response = await api.get('/notices/my');
  return response.data;
};

// Admin: list announcements for a gym
export const getGymNotices = async (gymId: string) => {
  const response = await api.get(`/notices/gym/${gymId}`);
  return response.data;
};

// Admin: create an announcement
export const createNotice = async (gymId: string, data: { title: string; content: string }) => {
  const response = await api.post(`/notices/gym/${gymId}`, data);
  return response.data;
};

// Admin: update an announcement
export const updateNotice = async (id: string, data: { title?: string; content?: string }) => {
  const response = await api.put(`/notices/${id}`, data);
  return response.data;
};

// Admin: delete an announcement
export const deleteNotice = async (id: string) => {
  const response = await api.delete(`/notices/${id}`);
  return response.data;
};
