import { api, clearSession, getRefreshToken, saveSession } from './session';
import type { AuthResponse, Me } from './types';

export type MemberSignup = {
  username: string;
  email: string;
  password: string;
  phone?: string;
  gymId?: string | null;
};

export type TrainerSignup = {
  username: string;
  email: string;
  password: string;
  phone: string;
  gymId: string;
  specialization?: string | null;
  experienceYears?: number | null;
  city?: string | null;
  bio?: string | null;
};

const startSession = async (res: AuthResponse) => {
  await saveSession(res.token, res.refreshToken);
  return res;
};

export const login = async (email: string, password: string) =>
  startSession(await api.post<AuthResponse>('/auth/login', { email, password }, false));

export const registerMember = async (body: MemberSignup) =>
  startSession(await api.post<AuthResponse>('/auth/register/member', body, false));

export const registerTrainer = async (body: TrainerSignup) =>
  startSession(await api.post<AuthResponse>('/auth/register/trainer', body, false));

export const forgotPassword = (email: string) =>
  api.post<{ message: string }>('/auth/forgot-password', { email }, false);

export const getMe = () => api.get<Me>('/auth/me');

export const updateProfile = (body: { username?: string; phone?: string | null }) =>
  api.put<unknown>('/auth/profile', body);

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.put<{ message: string }>('/auth/password', { currentPassword, newPassword });

export const logout = async () => {
  const refreshToken = await getRefreshToken();
  try {
    if (refreshToken) await api.post('/auth/logout', { refreshToken }, false);
  } catch {
    // Signing out locally must work offline too.
  }
  await clearSession();
};
