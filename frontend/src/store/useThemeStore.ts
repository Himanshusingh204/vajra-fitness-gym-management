import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'vf-theme',
      version: 2,
      // Older versions stored colour themes (blue, emerald...) that no longer exist
      migrate: (persisted) => {
        const theme = (persisted as { theme?: string } | undefined)?.theme;
        return { theme: theme === 'dark' ? 'dark' : 'light' } as ThemeStore;
      },
    }
  )
);
