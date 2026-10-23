import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeChoice = 'system' | 'light' | 'dark';

const THEME_COLORS = { light: '#f4f4f2', dark: '#141416' };
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

// index.html runs the same logic inline before first paint; keep the two in sync.
export function applyTheme(choice: ThemeChoice) {
  const mode = choice === 'system' ? (darkQuery.matches ? 'dark' : 'light') : choice;
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.classList.toggle('dark', mode === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[mode]);
}

interface ThemeStore {
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'vf-theme',
      version: 1,
      // v0 had five colour themes and defaulted to 'light' for everyone, so only
      // an explicit dark choice is kept.
      migrate: (persisted) => {
        const theme = (persisted as { theme?: string } | undefined)?.theme;
        return { theme: theme === 'dark' ? 'dark' : 'system' } as ThemeStore;
      },
      onRehydrateStorage: () => (state) => applyTheme(state?.theme ?? 'system'),
    },
  ),
);

darkQuery.addEventListener('change', () => {
  if (useThemeStore.getState().theme === 'system') applyTheme('system');
});
