import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { useAuthStore } from './store/useAuthStore';
// Imported for its side effect: rehydrates the theme and follows the OS setting.
import './store/useThemeStore';
import { reportWebVitals } from './utils/reportWebVitals';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

// Restore an existing httpOnly refresh-token session on startup (no token is
// persisted in localStorage, so a refresh cookie is the only thing that can
// restore a session). Fire-and-forget: bootstrapped flips true after the call.
useAuthStore.getState().bootstrap();

// Collect Core Web Vitals after the page settles (opt-in via env var).
window.addEventListener('load', () => {
  window.setTimeout(() => reportWebVitals(), 0);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
