import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Search } from 'lucide-react';
import EmptyState from './EmptyState';
import type { TableState } from './useTableQuery';

export type Column<T> = {
  key: string;
  header: string;
  /** Defaults to the row's `key` field as text. */
  cell?: (row: T) => ReactNode;
  /** Client mode sorts by this value. Setting it makes the column sortable. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Server mode: allow sorting by `key`. */
  sortable?: boolean;
  align?: 'left' | 'right';
};

type Props<T> = {
  /** Accessible name for the table, e.g. "Platform users". */
  label: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  state: TableState;
  onChange: (patch: Partial<TableState>) => void;
  /**
   * Server mode: the full match count. `rows` is then the current page, already
   * searched, filtered and sorted. Leave it out and the table does all of that
   * itself (client mode, for small lists).
   */
  total?: number;
  /** Shows the search box. */
  searchPlaceholder?: string;
  /** Client mode: the text a row's search matches against. */
  searchText?: (row: T) => string;
  /** Filter controls (chips, selects) shown next to search. */
  filters?: ReactNode;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onExport?: () => void;
  exporting?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
};

const compare = (a: unknown, b: unknown) => {
  if (a == null || a === '') return b == null || b === '' ? 0 : 1;
  if (b == null || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'en-IN', { numeric: true, sensitivity: 'base' });
};

// Keeps typing local and only reports the value after a pause, so each
// keystroke doesn't rewrite the URL or hit the server.
function SearchBox({ value, placeholder, onSearch }: { value: string; placeholder: string; onSearch: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    // Changed from outside (Clear filters, back button).
    setSeen(value);
    if (text.trim() !== value) setText(value);
  }

  useEffect(() => {
    if (text.trim() === value) return;
    const t = setTimeout(() => onSearch(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text, value, onSearch]);

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden="true" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={placeholder}
        placeholder={placeholder}
        className="input-field min-h-11 pl-9!"
      />
    </div>
  );
}

const pagerButton =
  'flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-charcoal)] transition-colors hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-40';

export default function DataTable<T>({
  label, columns, rows, rowKey, state, onChange, total, searchPlaceholder, searchText, filters,
  loading, error, onRetry, onExport, exporting, emptyTitle = 'Nothing here yet', emptyHint,
}: Props<T>) {
  const server = total !== undefined;
  const hasFilters = !!state.search || Object.keys(state.filters).length > 0;
  const clearFilters = () => onChange({ search: '', filters: {} });
  const isSortable = (c: Column<T>) => (server ? !!c.sortable : !!c.sortValue);

  let list = rows ?? [];
  if (!server) {
    const q = state.search.trim().toLowerCase();
    if (q && searchText) list = list.filter((r) => searchText(r).toLowerCase().includes(q));
    const sortCol = state.sort && columns.find((c) => c.key === state.sort?.key);
    if (sortCol?.sortValue) {
      const get = sortCol.sortValue;
      const sign = state.sort?.dir === 'desc' ? -1 : 1;
      list = [...list].sort((a, b) => sign * compare(get(a), get(b)));
    }
  }
  const count = server ? total : list.length;
  const pageCount = Math.max(1, Math.ceil(count / state.pageSize));
  const page = Math.min(state.page, pageCount);
  const visible = server ? list : list.slice((page - 1) * state.pageSize, page * state.pageSize);
  const from = count === 0 ? 0 : (page - 1) * state.pageSize + 1;
  const to = Math.min(page * state.pageSize, count);

  const toggleSort = (key: string) =>
    onChange({ sort: { key, dir: state.sort?.key === key && state.sort.dir === 'asc' ? 'desc' : 'asc' } });

  const render = (c: Column<T>, row: T) =>
    c.cell ? c.cell(row) : String((row as Record<string, unknown>)[c.key] ?? '—');

  const sortable = columns.filter(isSortable);
  const showToolbar = searchPlaceholder || filters || onExport || sortable.length > 0;

  let body: ReactNode;
  if (loading && !rows) {
    body = (
      <div aria-busy="true" aria-label={`Loading ${label}`} className="divide-y divide-[var(--color-border)]">
        {Array.from({ length: Math.min(state.pageSize, 6) }, (_, i) => (
          <div key={i} className="flex gap-4 px-4 py-4">
            {columns.slice(0, 4).map((c) => (
              <div key={c.key} className="h-4 flex-1 rounded bg-[var(--color-border)] motion-safe:animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  } else if (error && !rows) {
    body = (
      <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <AlertTriangle className="h-6 w-6 text-[var(--color-primary)]" aria-hidden="true" />
        <p className="font-semibold text-[var(--color-deepgray)]">Couldn't load {label.toLowerCase()}.</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-outline min-h-11">
            Try again
          </button>
        )}
      </div>
    );
  } else if (visible.length === 0) {
    body = hasFilters ? (
      <EmptyState title="Nothing matches these filters" hint="Try a different search or clear the filters." actionLabel="Clear filters" onAction={clearFilters} />
    ) : (
      <EmptyState title={emptyTitle} hint={emptyHint} />
    );
  } else {
    body = (
      <>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm" aria-label={label}>
            <thead className="border-b border-[var(--color-border)]">
              <tr>
                {columns.map((c) => {
                  const active = state.sort?.key === c.key ? state.sort.dir : null;
                  const Icon = active === 'asc' ? ArrowUp : active === 'desc' ? ArrowDown : ChevronsUpDown;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={isSortable(c) ? (active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none') : undefined}
                      className={`h-11 px-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {isSortable(c) ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className={`inline-flex h-11 items-center gap-1 uppercase tracking-wider hover:text-[var(--color-deepgray)] ${active ? 'text-[var(--color-deepgray)]' : ''}`}
                        >
                          {c.header}
                          <Icon className={`h-3.5 w-3.5 ${active ? '' : 'opacity-50'}`} aria-hidden="true" />
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {visible.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-[var(--color-border)]/25">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle text-[var(--color-charcoal)] ${c.align === 'right' ? 'text-right' : ''}`}>
                      {render(c, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul aria-label={label} className="divide-y divide-[var(--color-border)] sm:hidden">
          {visible.map((row) => (
            <li key={rowKey(row)} className="px-4 py-4">
              <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                {columns.map((c) => (
                  <Fragment key={c.key}>
                    <dt className="pt-0.5 text-xs font-semibold text-[var(--color-muted)]">{c.header}</dt>
                    <dd className="min-w-0 break-words text-[var(--color-charcoal)]">{render(c, row)}</dd>
                  </Fragment>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <div>
      {showToolbar && (
        <div className="flex flex-col gap-2 border-b border-[var(--color-border)] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          {searchPlaceholder && (
            <SearchBox value={state.search} placeholder={searchPlaceholder} onSearch={(search) => onChange({ search })} />
          )}
          {filters}
          {sortable.length > 0 && (
            <select
              value={state.sort ? `${state.sort.key}:${state.sort.dir}` : ''}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(':');
                onChange({ sort: key ? { key, dir: dir === 'desc' ? 'desc' : 'asc' } : null });
              }}
              aria-label="Sort by"
              className="input-field min-h-11 sm:hidden"
            >
              <option value="">Default order</option>
              {sortable.flatMap((c) => [
                <option key={`${c.key}:asc`} value={`${c.key}:asc`}>{c.header}, ascending</option>,
                <option key={`${c.key}:desc`} value={`${c.key}:desc`}>{c.header}, descending</option>,
              ])}
            </select>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-border)]/40"
            >
              Clear filters
            </button>
          )}
          {onExport && (
            <button type="button" onClick={onExport} disabled={exporting} className="btn-outline min-h-11 sm:ml-auto">
              <Download className="h-4 w-4" aria-hidden="true" />
              {exporting ? 'Exporting…' : 'Export'}
            </button>
          )}
        </div>
      )}

      {body}

      {count > 0 && !(loading && !rows) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-muted)]">
          <p aria-live="polite">
            {from}–{to} of {count}
          </p>
          {pageCount > 1 && (
            <nav aria-label={`${label} pages`} className="flex items-center gap-2">
              <button type="button" onClick={() => onChange({ page: page - 1 })} disabled={page <= 1} aria-label="Previous page" className={pagerButton}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-20 text-center">
                Page {page} of {pageCount}
              </span>
              <button type="button" onClick={() => onChange({ page: page + 1 })} disabled={page >= pageCount} aria-label="Next page" className={pagerButton}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
