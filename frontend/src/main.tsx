import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';

// Restore persisted theme before first paint
const stored = localStorage.getItem('vf-theme');
if (stored) {
  try {
    const { state } = JSON.parse(stored);
    if (state?.theme && state.theme !== 'light') {
      document.documentElement.setAttribute('data-theme', state.theme);
      if (state.theme === 'dark') document.documentElement.classList.add('dark');
    }
  } catch {
    // ignore parse errors
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
