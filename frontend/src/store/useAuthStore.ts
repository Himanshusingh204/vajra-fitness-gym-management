import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'GYM_ADMIN' | 'MEMBER' | 'TRAINER' | 'STAFF';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  bootstrapped: boolean;
  setAuth: (user: User, token: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
  bootstrap: () => Promise<void>;
}

// The access token is deliberately held ONLY in memory. It is never written to
// localStorage or any other persistent storage, so an XSS cannot exfiltrate a
// reusable token. Sessions survive page reloads via the httpOnly refresh-token
// cookie (SameSite=Strict), which the bootstrap flow below rotates on startup.
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  bootstrapped: false,
  setAuth: (user, token) => set({ user, token, isAuthenticated: true, bootstrapped: true }),
  setToken: (token) => set({ token, isAuthenticated: true }),
  logout: () => {
    // Revoke the refresh token and clear the httpOnly cookie server-side so a
    // logged-out session can't silently re-authenticate on the next reload.
    import('../services/api').then(({ default: api }) => {
      api.post('/auth/logout').catch(() => {});
    });
    set({ user: null, token: null, isAuthenticated: false, bootstrapped: true });
  },
  bootstrap: async () => {
    if (get().bootstrapped) return;
    try {
      const { default: api, refreshAccessToken } = await import('../services/api');
      // Use the same single-flight refresh as the 401 interceptor so the
      // httpOnly refresh cookie is never presented twice on startup.
      const token = await refreshAccessToken();
      if (!token) return set({ bootstrapped: true });

      set({ token, isAuthenticated: true });

      const meRes = await api.get('/auth/me');
      const user = meRes.data as User;
      set({ token, user, isAuthenticated: true, bootstrapped: true });
    } catch {
      set({ bootstrapped: true });
    }
  },
}));
