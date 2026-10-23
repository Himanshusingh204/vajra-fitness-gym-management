import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/errors';

let accountStateHandler: (() => void) | null = null;

// A trainer whose approval was withdrawn, or is still pending, gets 403s with
// these codes. Reloading /auth/me lets the router send them to the right screen.
export const onAccountStateChanged = (handler: (() => void) | null) => {
  accountStateHandler = handler;
};

const checkAccountState = (error: unknown) => {
  if (error instanceof ApiError && (error.code === 'TRAINER_PENDING' || error.code === 'TRAINER_REJECTED')) {
    accountStateHandler?.();
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: checkAccountState }),
  mutationCache: new MutationCache({ onError: checkAccountState }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return count < 2;
      },
    },
  },
});
