import api from '../services/api';

export interface AccountProfile {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'GYM_ADMIN' | 'MEMBER' | 'TRAINER' | 'STAFF';
  isActive: boolean;
  createdAt: string;
  gym: { id: string; name: string } | null;
  trainerStatus?: 'ACTIVE' | 'PENDING' | 'REJECTED';
}

export const getProfile = async () => {
  const response = await api.get<AccountProfile>('/auth/profile');
  return response.data;
};

// The server rejects any key other than username and phone. An empty phone clears it.
export const updateProfile = async (data: { username?: string; phone?: string | null }) => {
  const response = await api.put<AccountProfile>('/auth/profile', data);
  return response.data;
};
