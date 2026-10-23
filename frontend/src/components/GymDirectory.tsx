import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { MapPin, Search, Dumbbell, ArrowRight } from 'lucide-react';
import { getPublicGyms, type Gym } from '../api/gym.api';
import { formatDuration, formatPrice } from '../utils/format';
import { Reveal } from './Reveal';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80',
];

const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const GymCard = ({ gym, index }: { gym: Gym; index: number }) => {
  const facilities = useMemo(
    () =>
      (gym.facilities || '')
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean),
    [gym.facilities],
  );

  const image = gym.imageUrl || FALLBACK_IMAGES[hashString(gym.name) % FALLBACK_IMAGES.length];
  const cheapest = gym.membershipPlans[0];

  return (
    <Reveal delay={(index % 3) * 100} className="h-full">
      <article className="card-hover group h-full flex flex-col overflow-hidden">
        <div className="relative h-52 overflow-hidden">
          <img
            src={image}
            alt={gym.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="text-xl font-extrabold text-white drop-shadow group-hover:text-[var(--color-accent)] transition-colors">
              {gym.name}
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-white/80 mt-1">
              <MapPin className="w-4 h-4" />
              {gym.location || `${gym.city}, ${gym.state}`}
            </p>
          </div>
          {cheapest && (
            <span className="absolute top-4 right-4 chip bg-white/90! text-[var(--color-primary)]! backdrop-blur shadow-lg">
              From {formatPrice(cheapest.price)}
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 p-6">
          {facilities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {facilities.slice(0, 4).map((f) => (
                <span key={f} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {f}
                </span>
              ))}
              {facilities.length > 4 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-base-dark)] text-[var(--color-muted)]">
                  +{facilities.length - 4} more
                </span>
              )}
            </div>
          )}

          {gym.membershipPlans.length > 0 ? (
            <div className="space-y-2 mb-6">
              {gym.membershipPlans.slice(0, 3).map((plan) => (
                <div key={plan.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-[var(--color-base-dark)]/60 dark:bg-white/[0.04]">
                  <span className="font-semibold text-[var(--color-charcoal)] dark:text-white">{plan.name}</span>
                  <span className="font-bold text-[var(--color-primary)]">
                    {formatPrice(plan.price)}
                    <span className="font-medium text-[var(--color-muted)]"> / {formatDuration(plan.duration)}</span>
                  </span>
                </div>
              ))}
              {gym.membershipPlans.length > 3 && (
                <p className="text-xs font-semibold text-[var(--color-muted)] text-center pt-1">
                  +{gym.membershipPlans.length - 3} more plans
                </p>
              )}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="mt-auto">
            <Link
              to={`/register/member?gym=${gym.id}`}
              className="btn-primary w-full justify-center"
            >
              <Dumbbell className="w-4 h-4" />
              Join This Gym
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </article>
    </Reveal>
  );
};

const SkeletonCard = () => (
  <div className="card overflow-hidden">
    <div className="h-52 bg-[var(--color-base-dark)] dark:bg-white/5 animate-pulse" />
    <div className="p-6 space-y-4">
      <div className="h-5 w-3/4 bg-[var(--color-base-dark)] dark:bg-white/5 animate-pulse rounded-lg" />
      <div className="h-4 w-1/2 bg-[var(--color-base-dark)] dark:bg-white/5 animate-pulse rounded-lg" />
      <div className="h-10 w-full bg-[var(--color-base-dark)] dark:bg-white/5 animate-pulse rounded-xl" />
    </div>
  </div>
);

export const GymDirectory = ({ showSearch = true }: { showSearch?: boolean }) => {
  const { data: gyms = [], isLoading, isError } = useQuery({
    queryKey: ['public-gyms'],
    queryFn: getPublicGyms,
    staleTime: 60_000,
    refetchInterval: 30000,
  });

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('all');

  const cities = useMemo(() => Array.from(new Set(gyms.map((g) => g.city))).sort(), [gyms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return gyms.filter((g) => {
      const matchesCity = city === 'all' || g.city === city;
      const matchesQuery =
        !q ||
        g.name.toLowerCase().includes(q) ||
        (g.location || '').toLowerCase().includes(q) ||
        (g.facilities || '').toLowerCase().includes(q);
      return matchesCity && matchesQuery;
    });
  }, [gyms, query, city]);

  return (
    <div>
      {showSearch && (
        <div className="flex flex-col md:flex-row gap-3 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gyms, cities, facilities…"
              className="input-field pl-12!"
            />
          </div>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="input-field md:w-56 bg-white! dark:bg-[#1a1a1a]!"
          >
            <option value="all">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="card p-10 text-center text-[var(--color-muted)]">
          Couldn't load gyms. Please try again later.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg font-bold text-[var(--color-charcoal)] dark:text-white mb-1">No gyms found</p>
          <p className="text-sm text-[var(--color-muted)]">Try a different search or city.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((gym, i) => (
            <GymCard key={gym.id} gym={gym} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};
