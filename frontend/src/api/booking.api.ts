import api from '../services/api';

export const listTrainers = async (gymId?: string) => {
  const url = gymId ? `/bookings/trainers?gymId=${gymId}` : '/bookings/trainers';
  const res = await api.get(url);
  return res.data;
};

export const createBooking = async (data: { trainerId: string; date: string; time: string; notes?: string }) => {
  const res = await api.post('/bookings', data);
  return res.data;
};

export const getMyBookings = async () => {
  const res = await api.get('/bookings/my');
  return res.data;
};

export const getTrainerBookings = async () => {
  const res = await api.get('/bookings/trainer/my');
  return res.data;
};

export const updateBookingStatus = async (id: string, status: string) => {
  const res = await api.patch(`/bookings/${id}`, { status });
  return res.data;
};

export const getGymBookings = async (gymId: string, params?: { from?: string; to?: string; status?: string }) => {
  const res = await api.get(`/bookings/gym/${gymId}`, { params });
  return res.data;
};

export const getGymMemberships = async (gymId: string, params?: { status?: string; memberId?: string }) => {
  const res = await api.get(`/memberships/gym/${gymId}`, { params });
  return res.data;
};

export const createMembership = async (gymId: string, data: Record<string, unknown>) => {
  const res = await api.post(`/memberships/gym/${gymId}`, data);
  return res.data;
};

export const renewMembership = async (gymId: string, data: Record<string, unknown>) => {
  const res = await api.post(`/memberships/gym/${gymId}/renew`, data);
  return res.data;
};

export const getMyGymSubscription = async () => {
  const res = await api.get('/saas/my-subscription');
  return res.data;
};
