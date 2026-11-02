import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useGymStore } from '../store/useGymStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const DB_DOWN_MESSAGE = "Can't reach the database right now. Try again in a minute.";
const isDbDown = (err: any) => err?.response?.status === 503 && err.response.data?.code === 'DB_UNREACHABLE';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const gymId = useGymStore.getState().gymId;
  if (gymId && useAuthStore.getState().user?.role === 'MEMBER') config.headers['X-Gym-Id'] = gymId;
  return config;
});

// ---- 401 → silent refresh-token retry (keeps sessions alive) ----
const performRefresh = async (): Promise<string | null> => {
  try {
    const res = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
    const token = res.data?.token;
    if (token) useAuthStore.getState().setToken(token);
    return token ?? null;
  } catch (err) {
    // The session is still fine when only the database is down, so callers
    // must not treat this like a rejected refresh token and log the user out.
    if (isDbDown(err)) {
      useNotificationStore.getState().addNotification('error', DB_DOWN_MESSAGE);
      throw err;
    }
    return null;
  }
};

// Single-flight refresh: concurrent callers share one in-flight request. The
// httpOnly refresh cookie is rotated on every call, so presenting it twice (a
// race between bootstrap and a 401 retry) triggers server-side reuse detection
// and revokes the whole token family. Sharing the promise prevents that.
let refreshPromise: Promise<string | null> | null = null;
export const refreshAccessToken = (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const isAuthCall = original?.url?.includes('/auth/');

    if (err.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      let token: string | null;
      try {
        token = await refreshAccessToken();
      } catch {
        return Promise.reject(err);
      }
      if (token) return api(original);

      useAuthStore.getState().logout();
      window.location.href = '/login';
    } else {
      const isSilentAuthCheck = original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/me');
      // Do not pop up error notifications for expected 401s during background session checks
      if (!(err.response?.status === 401 && isSilentAuthCheck)) {
        // No HTTP response means a network-level failure (backend down, CORS, offline).
        const message = isDbDown(err)
          ? DB_DOWN_MESSAGE
          : err.response
          ? (err.response.data?.error || 'Something went wrong. Please try again.')
          : 'Unable to reach the server. Check that the backend is running and try again.';
        useNotificationStore.getState().addNotification('error', message);
      }
    }
    return Promise.reject(err);
  }
);

// Download a file (PDF) using the authenticated client
export const downloadFile = async (url: string, fallbackName: string) => {
  const res = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
};

export default api;
