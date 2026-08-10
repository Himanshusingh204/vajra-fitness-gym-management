import api from '../services/api';

export interface GymClass {
  id: string;
  name: string;
  description?: string | null;
  capacity: number;
  duration: number;
  dayOfWeek?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  isActive: boolean;
  trainer?: { user: { id: string; username: string } } | null;
  branch?: { id: string; name: string } | null;
  branchId?: string | null;
  _count?: { bookings: number };
}

export interface ClassBooking {
  id: string;
  status: string;
  notes?: string | null;
  member: {
    id: string;
    userId: string;
    user: { id: string; username: string; email: string; phone?: string | null };
  };
}

export const getClasses = async (gymId: string, params?: { day?: string; branchId?: string }) => {
  const response = await api.get<GymClass[]>(`/classes/gym/${gymId}`, { params });
  return response.data;
};

export const createClass = async (gymId: string, data: Partial<GymClass>) => {
  const response = await api.post<GymClass>(`/classes/gym/${gymId}`, data);
  return response.data;
};

export const updateClass = async (id: string, data: Partial<GymClass>) => {
  const response = await api.put<GymClass>(`/classes/${id}`, data);
  return response.data;
};

export const deleteClass = async (id: string) => {
  const response = await api.delete(`/classes/${id}`);
  return response.data;
};

export const bookClass = async (classId: string) => {
  const response = await api.post(`/classes/${classId}/book`);
  return response.data;
};

export const cancelClassBooking = async (bookingId: string) => {
  const response = await api.delete(`/classes/bookings/${bookingId}`);
  return response.data;
};

export const getClassBookings = async (classId: string) => {
  const response = await api.get<ClassBooking[]>(`/classes/${classId}/bookings`);
  return response.data;
};
