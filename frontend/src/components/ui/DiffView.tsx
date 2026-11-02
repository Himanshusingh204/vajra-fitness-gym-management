import type { ReactNode } from 'react';

type Props<T extends Record<string, unknown>> = {
  current: Partial<T> | null | undefined;
  proposed: Partial<T>;
  /** Field label per key. Also sets which fields show and in what order. */
  labels: Partial<Record<keyof T & string, string>>;
  /** Custom display for a value, e.g. money or dates. */
  format?: (key: keyof T & string, value: unknown) => ReactNode;
  /** Hide fields that didn't change. */
  changedOnly?: boolean;
};

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const show = (value: unknown): ReactNode => {
  if (value == null || value === '') return <span className="text-[var(--color-muted)]">—</span>;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : <span className="text-[var(--color-muted)]">—</span>;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function DiffView<T extends Record<string, unknown>>({ current, proposed, labels, format, changedOnly }: Props<T>) {
  const keys = Object.keys(labels) as (keyof T & string)[];
  const rows = keys
    .map((key) => ({ key, before: current?.[key], after: proposed[key] }))
    .map((r) => ({ ...r, changed: !same(r.before, r.after) }))
    .filter((r) => !changedOnly || r.changed);
  const render = (key: keyof T & string, value: unknown) => (format ? format(key, value) : show(value));
  const changedCount = rows.filter((r) => r.changed).length;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
      <div className="hidden grid-cols-[12rem_1fr_1fr] border-b border-[var(--color-border)] text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] sm:grid" aria-hidden="true">
        <span className="px-4 py-2.5">Field</span>
        <span className="px-4 py-2.5">Current</span>
        <span className="px-4 py-2.5">Proposed</span>
      </div>
      <p className="sr-only">{changedCount} of {rows.length} fields changed.</p>
      <dl className="divide-y divide-[var(--color-border)] text-sm">
        {rows.map(({ key, before, after, changed }) => (
          <div key={key} className={`grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr_1fr] sm:gap-0 sm:px-0 sm:py-0 ${changed ? 'bg-[#fbf3db]/60 dark:bg-[#fbbf24]/10' : ''}`}>
            <dt className="flex items-center gap-2 font-semibold text-[var(--color-deepgray)] sm:px-4 sm:py-3">
              {labels[key]}
              {changed && (
                <span className="rounded-full bg-[#fbf3db] px-2 py-0.5 text-[11px] font-semibold text-[#8a5d00] dark:bg-[#fbbf24]/15 dark:text-[#fcd34d]">Changed</span>
              )}
            </dt>
            <dd className="min-w-0 break-words text-[var(--color-muted)] sm:px-4 sm:py-3">
              <span className="mr-1 text-xs font-semibold sm:sr-only">Current:</span>
              <span className={changed ? 'line-through decoration-[var(--color-border-strong)]' : ''}>{render(key, before)}</span>
            </dd>
            <dd className={`min-w-0 break-words sm:px-4 sm:py-3 ${changed ? 'font-semibold text-[var(--color-deepgray)]' : 'text-[var(--color-muted)]'}`}>
              <span className="mr-1 text-xs font-semibold text-[var(--color-muted)] sm:sr-only">Proposed:</span>
              {render(key, after)}
            </dd>
          </div>
        ))}
      </dl>
      {rows.length === 0 && <p className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">No changes.</p>}
    </div>
  );
}
