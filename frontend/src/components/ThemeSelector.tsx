import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export function ThemeSelector() {
  const { theme, setTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-deepgray)] hover:bg-[var(--color-border)]/40 transition-all"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
