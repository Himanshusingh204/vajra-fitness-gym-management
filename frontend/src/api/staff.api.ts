import api from '../services/api';

export const getGymAttendance = async (gymId: string, params?: { date?: string; search?: string; status?: string; page?: number; limit?: number }) => {
  const response = await api.get(`/attendance/gym/${gymId}`, { params });
  return response.data;
};

export const markAttendance = async (gymId: string, body: { memberId?: string; staffId?: string }) => {
  const response = await api.post(`/attendance/gym/${gymId}`, body);
  return response.data;
};
