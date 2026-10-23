import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from './cx';

type TabItem = { id: string; label: string; count?: number };

type TabsProps = {
  /** Prefix for tab and panel ids; pass the same value to TabPanel. */
  id: string;
  label: string;
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
};

export function Tabs({ id, label, items, value, onChange }: TabsProps) {
  const onKeyDown = (e: KeyboardEvent) => {
    const i = items.findIndex((t) => t.id === value);
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const tab = items[(next + items.length) % items.length];
    onChange(tab.id);
    document.getElementById(`${id}-tab-${tab.id}`)?.focus();
  };

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            id={`${id}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${id}-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cx(
              '-mb-px inline-flex min-h-11 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
              selected ? 'border-accent-ink text-accent-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="rounded-full bg-surface-sunken px-2 text-xs tabular-nums">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ tabsId, value, children }: { tabsId: string; value: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${tabsId}-panel-${value}`} aria-labelledby={`${tabsId}-tab-${value}`} tabIndex={0} className="pt-5">
      {children}
    </div>
  );
}
