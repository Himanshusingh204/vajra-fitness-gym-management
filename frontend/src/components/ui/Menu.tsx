import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';

type MenuProps = {
  label: string;
  /** Content of the trigger button (icon, avatar, text). */
  trigger: ReactNode;
  /** Items get `close` so links and actions can shut the menu. Give each role="menuitem" or "menuitemradio". */
  children: (close: () => void) => ReactNode;
  triggerClassName?: string;
};

export function Menu({ label, trigger, children, triggerClassName }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const items = () => Array.from(root.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const list = items();
    (list.find((el) => el.getAttribute('aria-checked') === 'true') ?? list[0])?.focus();
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') return close();
    if (e.key === 'Tab') return close(false);
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-control text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink',
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open && (
        <div role="menu" aria-label={label} className="absolute right-0 top-full z-40 mt-2 min-w-48 rounded-card border border-line bg-surface-raised p-1.5 shadow-overlay">
          {children(() => close())}
        </div>
      )}
    </div>
  );
}

export const menuItemClass =
  'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-control px-3 text-left text-sm text-ink hover:bg-surface-sunken focus-visible:bg-surface-sunken';
