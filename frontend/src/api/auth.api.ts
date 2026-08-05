import api from '../services/api';

export const activateAccount = async (token: string, password: string) => {
  const response = await api.post('/auth/activate', { token, password });
  return response.data;
};

export const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const response = await api.post('/auth/reset-password', { token, newPassword });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await api.put('/auth/password', { currentPassword, newPassword });
  return response.data;
};
