import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { MapPin, Search, SearchX } from 'lucide-react';
import { getPublicGyms, type Gym } from '../api/gym.api';
import { splitFacilities } from '../utils/facilities';
import { formatDuration, formatPrice } from '../utils/format';
import { EmptyState, Field, ImagePanel, Input, Select, Skeleton, buttonClasses } from './ui';

function GymCard({ gym }: { gym: Gym }) {
  const facilities = splitFacilities(gym.facilities);
  const cheapest = gym.membershipPlans.reduce<Gym['membershipPlans'][number] | null>(
    (best, plan) => (!best || plan.price < best.price ? plan : best),
    null,
  );

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface">
      <ImagePanel
        src={gym.imageUrl ?? undefined}
        alt={`${gym.name} gym`}
        width={800}
        height={500}
        label={`Photo of ${gym.name}`}
        className="rounded-b-none"
      />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold tracking-tight text-ink">
          <Link to={`/gyms/${gym.id}`} className="after:absolute after:inset-0 hover:text-accent-ink">
            {gym.name}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {gym.location || `${gym.city}, ${gym.state}`}
        </p>
        {facilities.length > 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            {facilities.slice(0, 4).join(', ')}
            {facilities.length > 4 && ` and ${facilities.length - 4} more`}
          </p>
        )}
        <p className="mt-auto pt-4 text-sm text-ink">
          {cheapest ? (
            <>
              From <span className="font-bold">{formatPrice(cheapest.price)}</span>
              <span className="text-ink-muted"> for {formatDuration(cheapest.duration)}</span>
            </>
          ) : (
            <span className="text-ink-muted">Plans not listed yet</span>
          )}
        </p>
      </div>
    </article>
  );
}

export function GymDirectory() {
  const { data: gyms = [], isLoading, isError } = useQuery({
    queryKey: ['public-gyms'],
    queryFn: getPublicGyms,
    staleTime: 60_000,
  });
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('all');

  const cities = useMemo(() => Array.from(new Set(gyms.map((g) => g.city))).sort(), [gyms]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return gyms.filter(
      (g) =>
        (city === 'all' || g.city === city) &&
        (!q || [g.name, g.location, g.facilities].some((field) => (field || '').toLowerCase().includes(q))),
    );
  }, [gyms, query, city]);

  return (
    <div>
      <div className="mb-8 grid gap-4 sm:grid-cols-[1fr_14rem]">
        <Field label="Search by name, area or facility">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
          </div>
        </Field>
        <Field label="City">
          <Select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="all">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Could not load the gyms" description="Check your connection and reload the page." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={gyms.length === 0 ? 'No gyms are listed yet' : 'No gym matches that search'}
          description={gyms.length === 0 ? 'Gyms appear here once they are approved.' : 'Try another name or pick all cities.'}
          action={gyms.length === 0 ? <Link to="/register/partner" className={buttonClasses('primary')}>List your gym</Link> : undefined}
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((gym) => (
            <li key={gym.id} className="relative">
              <GymCard gym={gym} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
