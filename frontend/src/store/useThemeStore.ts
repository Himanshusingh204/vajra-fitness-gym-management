import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'blue' | 'emerald' | 'purple' | 'ocean' | 'corporate';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set(() => {
        if (theme === 'light') {
          document.documentElement.removeAttribute('data-theme');
          document.documentElement.classList.remove('dark');
        } else if (theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.setAttribute('data-theme', theme);
          document.documentElement.classList.remove('dark');
        }
        return { theme };
      }),
    }),
    { name: 'vf-theme' }
  )
);
