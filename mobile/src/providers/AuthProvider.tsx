import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as auth from '../api/auth';
import { ApiError } from '../api/errors';
import { api, getRefreshToken, onSessionEnded } from '../api/session';
import type { Me } from '../api/types';
import { onAccountStateChanged } from '../lib/queryClient';

type Status = 'loading' | 'signedOut' | 'signedIn' | 'unreachable';

type AuthValue = {
  status: Status;
  user: Me | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUpMember: (body: auth.MemberSignup) => Promise<void>;
  signUpTrainer: (body: auth.TrainerSignup) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<Me | null>(null);
  const [attempt, setAttempt] = useState(0);

  const endSession = useCallback(() => {
    queryClient.clear();
    setUser(null);
    setStatus('signedOut');
  }, [queryClient]);

  useEffect(() => {
    onSessionEnded(endSession);
    return () => onSessionEnded(null);
  }, [endSession]);

  // Restore the session from the stored refresh token on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getRefreshToken();
        if (!stored || !(await api.refreshAccessToken())) {
          if (!cancelled) setStatus('signedOut');
          return;
        }
        const me = await auth.getMe();
        if (!cancelled) {
          setUser(me);
          setStatus('signedIn');
        }
      } catch (err) {
        if (cancelled) return;
        setStatus(err instanceof ApiError && err.code === 'NETWORK' ? 'unreachable' : 'signedOut');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const loadUser = useCallback(async () => {
    const me = await auth.getMe();
    setUser(me);
    setStatus('signedIn');
  }, []);

  useEffect(() => {
    onAccountStateChanged(() => {
      loadUser().catch(() => {});
    });
    return () => onAccountStateChanged(null);
  }, [loadUser]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      signIn: async (email, password) => {
        await auth.login(email, password);
        await loadUser();
      },
      signUpMember: async (body) => {
        await auth.registerMember(body);
        await loadUser();
      },
      signUpTrainer: async (body) => {
        await auth.registerTrainer(body);
        await loadUser();
      },
      signOut: async () => {
        await auth.logout();
        endSession();
      },
      reloadUser: loadUser,
      retry: () => {
        setStatus('loading');
        setAttempt((n) => n + 1);
      },
    }),
    [status, user, loadUser, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// Screens below a role layout only render once the user is loaded.
export function useUser(): Me {
  const { user } = useAuth();
  if (!user) throw new Error('useUser called without a signed in user');
  return user;
}
