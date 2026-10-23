import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore, type ThemeChoice } from '../store/useThemeStore';
import { Menu, menuItemClass } from './ui/Menu';

const OPTIONS: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

export function ThemeSelector() {
  const { theme, setTheme } = useThemeStore();
  const Current = OPTIONS.find((o) => o.id === theme)?.icon ?? Monitor;

  return (
    <Menu label="Theme" trigger={<Current className="size-5" aria-hidden="true" />}>
      {(close) =>
        OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="menuitemradio"
            aria-checked={theme === id}
            onClick={() => {
              setTheme(id);
              close();
            }}
            className={menuItemClass}
          >
            <Icon className="size-4 text-ink-muted" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {theme === id && <Check className="size-4 text-accent-ink" aria-hidden="true" />}
          </button>
        ))
      }
    </Menu>
  );
}
