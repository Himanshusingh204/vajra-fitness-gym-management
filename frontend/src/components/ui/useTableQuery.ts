import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export type SortDir = 'asc' | 'desc';
export type Sort = { key: string; dir: SortDir } | null;

export type TableState = {
  page: number;
  pageSize: number;
  sort: Sort;
  search: string;
  filters: Record<string, string>;
};

type Options = {
  pageSize?: number;
  sort?: Sort;
  /** Query params that count as filters, e.g. ['role', 'status']. */
  filterKeys?: string[];
};

const positive = (value: string | null, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export function readTableState(params: URLSearchParams, { pageSize = 20, sort = null, filterKeys = [] }: Options = {}): TableState {
  const [key, dir] = (params.get('sort') ?? '').split(':');
  const filters: Record<string, string> = {};
  for (const k of filterKeys) {
    const v = params.get(k);
    if (v) filters[k] = v;
  }
  return {
    page: positive(params.get('page'), 1),
    pageSize: positive(params.get('pageSize'), pageSize),
    sort: key ? { key, dir: dir === 'desc' ? 'desc' : 'asc' } : sort,
    search: params.get('q') ?? '',
    filters,
  };
}

// Writes the state back as ?page&pageSize&sort=key:dir&q&<filter>, leaving
// out defaults so a fresh page keeps a clean URL. Other params are kept.
export function writeTableState(params: URLSearchParams, state: TableState, { pageSize = 20, sort = null, filterKeys = [] }: Options = {}) {
  const next = new URLSearchParams(params);
  const set = (k: string, v: string | null) => (v ? next.set(k, v) : next.delete(k));
  const sortParam = state.sort ? `${state.sort.key}:${state.sort.dir}` : null;
  const defaultSort = sort ? `${sort.key}:${sort.dir}` : null;
  set('page', state.page > 1 ? String(state.page) : null);
  set('pageSize', state.pageSize !== pageSize ? String(state.pageSize) : null);
  set('sort', sortParam !== defaultSort ? sortParam : null);
  set('q', state.search.trim() || null);
  for (const k of filterKeys) set(k, state.filters[k] || null);
  return next;
}

/**
 * Table page, sort, search and filters kept in the URL, so a filtered list
 * survives refresh, back/forward and can be shared. Any change other than the
 * page itself sends the user back to page 1.
 */
export function useTableQuery(options: Options = {}) {
  const [params, setParams] = useSearchParams();
  // Callers usually pass a literal, so key the memo on its contents.
  const optionsKey = JSON.stringify(options);
  const opts = useMemo<Options>(() => JSON.parse(optionsKey), [optionsKey]);
  const state = useMemo(() => readTableState(params, opts), [params, opts]);

  const update = useCallback(
    (patch: Partial<TableState>) => {
      setParams(
        (prev) => {
          const current = readTableState(prev, opts);
          const next = { ...current, ...patch };
          if (!('page' in patch)) next.page = 1;
          return writeTableState(prev, next, opts);
        },
        { replace: true },
      );
    },
    [setParams, opts],
  );

  const hasFilters = !!state.search || Object.keys(state.filters).length > 0;
  const clearFilters = useCallback(() => update({ search: '', filters: {} }), [update]);

  return { state, update, hasFilters, clearFilters };
}
