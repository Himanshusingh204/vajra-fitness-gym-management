import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, Clock, LocateFixed, MapPin, RefreshCw, Search, X } from 'lucide-react';
import { getGymCities, searchGyms, type Gym } from '../api/gym.api';
import { useTableQuery } from './ui/useTableQuery';
import { formatDuration, formatPrice } from '../utils/format';
import { Reveal } from './Reveal';
import { cheapestPlan, gymAccent, splitList } from '../pages/gym-site/gymData';

const MAX_FACILITIES = 4;
const PAGE_SIZE = 12;
const TABLE_OPTS = { pageSize: PAGE_SIZE, sort: { key: 'relevance', dir: 'asc' as const }, filterKeys: ['city', 'facility', 'minPrice', 'maxPrice', 'lat', 'lng'] };

function GymCover({ gym, className }: { gym: Gym; className: string }) {
  if (gym.imageUrl) {
    return <img src={gym.imageUrl} alt={`${gym.name} training floor`} loading="lazy" className={`object-cover ${className}`} />;
  }
  // No photo yet: the gym's name set large on its own colour, so the card still looks like that gym
  return (
    <div aria-hidden className={`flex items-end bg-[color-mix(in_srgb,var(--gym-accent)_22%,var(--color-base-dark))] p-5 ${className}`}>
      <span className="font-display text-5xl uppercase leading-[0.9] tracking-wide text-[var(--color-deepgray)]">{gym.name}</span>
    </div>
  );
}

function GymCard({ gym, featured, index }: { gym: Gym; featured: boolean; index: number }) {
  const facilities = splitList(gym.facilities);
  const plans = gym.membershipPlans.filter((p) => p.isActive !== false);
  const cheapest = cheapestPlan(plans);
  const place = gym.location || [gym.city, gym.state].filter(Boolean).join(', ');

  return (
    <Reveal delay={(index % 3) * 80} className={featured ? 'md:col-span-2' : ''}>
      <article
        style={gymAccent(gym.brandColor)}
        className={`group relative flex h-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-[border-color,box-shadow] duration-300 hover:border-[var(--color-border-strong)] hover:shadow-[0_20px_45px_-32px_rgba(0,0,0,0.45)] ${
          featured ? 'flex-col md:flex-row' : 'flex-col'
        }`}
      >
        <div className={`relative shrink-0 overflow-hidden ${featured ? 'md:w-[48%]' : ''}`}>
          <GymCover
            gym={gym}
            className={`w-full transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none ${
              featured ? 'h-64 md:h-full md:min-h-[23rem]' : 'h-60'
            }`}
          />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[var(--gym-accent)]" />
          {gym.distanceKm != null && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              <LocateFixed className="h-3.5 w-3.5" />
              {gym.distanceKm} km away
            </span>
          )}
        </div>

        <div className={`flex min-w-0 flex-1 flex-col p-5 sm:p-6 ${featured ? 'md:justify-center md:p-8' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 break-words text-xl font-extrabold leading-tight tracking-tight text-[var(--color-deepgray)] sm:text-2xl">
              <Link to={`/gyms/${gym.id}`} className="hover:text-[var(--color-primary)]">
                {gym.name}
              </Link>
            </h3>
            {gym.isApproved && (
              <BadgeCheck aria-label="Verified gym" className="mt-1 h-5 w-5 shrink-0 text-[var(--color-secondary)]" />
            )}
          </div>

          <ul className="mt-3 space-y-1.5 text-sm text-[var(--color-muted)]">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
              <span className="truncate">{place}</span>
            </li>
            {gym.openingHours && (
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                <span className="line-clamp-2">{gym.openingHours}</span>
              </li>
            )}
          </ul>

          {gym.tagline && <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-[var(--color-charcoal)]">{gym.tagline}</p>}

          {facilities.length > 0 && (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              {facilities.slice(0, MAX_FACILITIES).join(' · ')}
              {facilities.length > MAX_FACILITIES && ` · +${facilities.length - MAX_FACILITIES} more`}
            </p>
          )}

          <div className="mt-auto pt-5">
            <div className="border-t border-[var(--color-border)] pt-4">
              {cheapest ? (
                <p>
                  <span className="block text-xs font-semibold text-[var(--color-muted)]">From</span>
                  <span className="text-2xl font-extrabold tabular-nums text-[var(--color-deepgray)]">{formatPrice(cheapest.price)}</span>
                  <span className="text-sm text-[var(--color-muted)]"> / {formatDuration(cheapest.duration)}</span>
                </p>
              ) : (
                <p className="text-sm text-[var(--color-muted)]">Ask the gym for prices</p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link to={`/gyms/${gym.id}`} className="btn-primary min-h-11 flex-1 justify-center">
              Explore gym <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={`/register/member?gym=${gym.id}`} className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-[var(--color-primary)] underline-offset-4 hover:underline">
              Join
            </Link>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

const SkeletonCard = () => (
  <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
    <div className="h-48 animate-pulse bg-[var(--color-border)]" />
    <div className="space-y-3 p-6">
      <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--color-border)]" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--color-border)]" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--color-border)]" />
    </div>
  </div>
);

export const GymDirectory = ({ showSearch = true }: { showSearch?: boolean }) => {
  const { state, update, hasFilters, clearFilters } = useTableQuery(TABLE_OPTS);
  const { filters } = state;
  const sort = state.sort?.key ?? 'relevance';
  const near = !!(filters.lat && filters.lng);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['public-gyms', state.search, filters, sort, state.page],
    queryFn: () =>
      searchGyms({
        q: state.search,
        ...filters,
        sort: sort === 'distance' && !near ? 'relevance' : sort,
        page: state.page,
        limit: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
  const { data: cities = [] } = useQuery({ queryKey: ['public-gym-cities'], queryFn: getGymCities, staleTime: 300_000 });

  const gyms = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Search text is typed locally and pushed to the URL after a short pause.
  const [text, setText] = useState(state.search);
  const [seenSearch, setSeenSearch] = useState(state.search);
  if (state.search !== seenSearch) {
    setSeenSearch(state.search);
    if (text.trim() !== state.search) setText(state.search);
  }
  useEffect(() => {
    if (text.trim() === state.search) return;
    const t = setTimeout(() => update({ search: text }), 350);
    return () => clearTimeout(t);
  }, [text, state.search, update]);

  const [geoError, setGeoError] = useState('');
  const setFilter = (patch: Record<string, string>) => update({ filters: { ...filters, ...patch } });
  const findNearMe = () => {
    setGeoError('');
    if (!navigator.geolocation) return setGeoError('Location is not available in this browser.');
    navigator.geolocation.getCurrentPosition(
      (pos) => update({ filters: { ...filters, lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }, sort: { key: 'distance', dir: 'asc' } }),
      () => setGeoError('We could not read your location. Check the browser permission.'),
      { timeout: 10_000 },
    );
  };
  const stopNearMe = () => update({ filters: { ...filters, lat: '', lng: '' }, sort: sort === 'distance' ? { key: 'relevance', dir: 'asc' } : state.sort });

  // Facility chips come from the gyms on screen, and the chosen one always stays.
  const facilityOptions = useMemo(() => {
    const seen = new Set(gyms.flatMap((g) => splitList(g.facilities)));
    if (filters.facility) seen.add(filters.facility);
    return Array.from(seen).sort().slice(0, 10);
  }, [gyms, filters.facility]);

  const filtering = hasFilters;
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
      active
        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
        : 'border-[var(--color-border-strong)] text-[var(--color-charcoal)] hover:border-[var(--color-primary)]'
    }`;
  const pageBtn = 'btn-outline min-h-11 disabled:opacity-40';

  return (
    <div>
      {showSearch && (
        <div className="mb-10 space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-[var(--color-deepgray)]">Find your fit</h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">Search by name or narrow down your options.</p>
            </div>
            {filtering && <button type="button" onClick={() => { setText(''); clearFilters(); }} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"><X className="h-4 w-4" /> Clear filters</button>}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search by gym, area or facility"
              aria-label="Search gyms"
              className="input-field py-3 pl-12"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            <select value={filters.city ?? ''} onChange={(e) => setFilter({ city: e.target.value })} aria-label="City" className="input-field min-h-11">
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={sort} onChange={(e) => update({ sort: { key: e.target.value, dir: 'asc' } })} aria-label="Sort gyms" className="input-field min-h-11">
              <option value="relevance">Best match</option>
              <option value="price">Lowest price</option>
              <option value="newest">Newest</option>
              {near && <option value="distance">Nearest</option>}
            </select>
            <input
              key={`min-${filters.minPrice ?? ''}`}
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={filters.minPrice ?? ''}
              onBlur={(e) => e.target.value !== (filters.minPrice ?? '') && setFilter({ minPrice: e.target.value })}
              placeholder="Min price"
              aria-label="Minimum price"
              className="input-field min-h-11"
            />
            <input
              key={`max-${filters.maxPrice ?? ''}`}
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={filters.maxPrice ?? ''}
              onBlur={(e) => e.target.value !== (filters.maxPrice ?? '') && setFilter({ maxPrice: e.target.value })}
              placeholder="Max price"
              aria-label="Maximum price"
              className="input-field min-h-11"
            />
            <button type="button" onClick={near ? stopNearMe : findNearMe} className={`${near ? 'btn-primary' : 'btn-outline'} min-h-11 justify-center sm:col-span-2 lg:col-span-1`} aria-pressed={near}>
              <LocateFixed className="h-4 w-4" />
              {near ? 'Near me: on' : 'Near me'}
            </button>
          </div>
          {geoError && <p role="alert" className="text-sm text-[var(--color-primary)]">{geoError}</p>}
          {facilityOptions.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by facility">
              {facilityOptions.map((f) => (
                <button key={f} type="button" aria-pressed={filters.facility === f} onClick={() => setFilter({ facility: filters.facility === f ? '' : f })} className={chip(filters.facility === f)}>
                  {f}
                </button>
              ))}
            </div>
          )}
          {!isLoading && !isError && (
            <p className="border-t border-[var(--color-border)] pt-4 text-sm font-semibold text-[var(--color-muted)]" aria-live="polite">
              {total} {total === 1 ? 'gym' : 'gyms'}
              {filters.city && ` in ${filters.city}`}
            </p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <p className="text-lg font-bold text-[var(--color-deepgray)]">We couldn't load the gyms</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Check your connection and try again.</p>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-outline mt-5">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Try again
          </button>
        </div>
      ) : gyms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-10 text-center">
          <p className="text-lg font-bold text-[var(--color-deepgray)]">
            {filtering ? 'No gyms match that search' : 'No gyms listed yet'}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {filtering ? 'Try another name, area or city.' : 'Partner gyms will appear here once they go live.'}
          </p>
          {filtering && (
            <button type="button" onClick={() => { setText(''); clearFilters(); }} className="btn-outline mt-5">
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gyms.map((gym, i) => (
            <GymCard key={gym.id} gym={gym} index={i} featured={!filtering && state.page === 1 && i === 0 && gyms.length > 3 && (gyms.length - 1) % 3 === 0} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-between gap-3" aria-label="Pagination">
          <button type="button" className={pageBtn} disabled={state.page <= 1} onClick={() => update({ page: state.page - 1 })}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-[var(--color-muted)]">Page {state.page} of {pages}</span>
          <button type="button" className={pageBtn} disabled={state.page >= pages} onClick={() => update({ page: state.page + 1 })}>
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
};
