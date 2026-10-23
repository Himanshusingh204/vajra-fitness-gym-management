import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { cx } from './cx';

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  loading?: boolean;
  /** Shown when rows is empty and not loading; an EmptyState fits well. */
  empty?: ReactNode;
};

/** A plain table that turns into stacked label/value rows under 640px. */
export function DataTable<T>({ columns, rows, rowKey, caption, loading = false, empty }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm max-sm:block">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-surface-sunken text-left text-ink-muted max-sm:hidden">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx('px-4 py-2.5 font-medium', c.align === 'right' && 'text-right')}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line max-sm:block">
          {loading &&
            Array.from({ length: 3 }, (_, i) => (
              <tr key={i} className="max-sm:block max-sm:py-3">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 max-sm:block max-sm:py-1">
                    <Skeleton className="h-4 w-full max-w-40" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows.length === 0 && empty && (
            <tr className="max-sm:block">
              <td colSpan={columns.length} className="max-sm:block">
                {empty}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr key={rowKey(row)} className="text-ink max-sm:block max-sm:py-3">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cx(
                      'px-4 py-3 align-middle max-sm:flex max-sm:justify-between max-sm:gap-4 max-sm:py-1',
                      c.align === 'right' && 'text-right tabular-nums',
                      c.className,
                    )}
                  >
                    <span className="font-medium text-ink-muted sm:hidden">{c.header}</span>
                    <span className="max-sm:text-right">{c.cell(row)}</span>
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
