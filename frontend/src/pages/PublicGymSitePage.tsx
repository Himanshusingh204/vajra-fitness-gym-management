import { Link, NavLink, Outlet, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { getPublicGym, getPublicSite } from '../api/gym.api';
import { usePageMeta } from '../hooks/usePageMeta';
import { SITE_URL } from '../utils/constants';
import NotFoundPage from './NotFoundPage';
import { formatDuration, formatPrice } from '../utils/format';
import { buildImages, cheapestPlan, gymAccent, useGymJsonLd, type GymSite } from './gym-site/gymData';

// Shell for every page of one gym's public site: slim sticky nav plus the routed page
export default function PublicGymSitePage() {
  const { gymId, slug } = useParams();
  const { data: gym, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public-gym', gymId ?? slug],
    queryFn: () => (gymId ? getPublicGym(gymId) : getPublicSite(slug ?? '')),
    retry: false,
  });

  const phone = gym?.phone ?? gym?.branches.find((b) => b.phone)?.phone ?? null;
  useGymJsonLd(gym, phone, SITE_URL);
  // Pages set their own title; this keeps the tab sensible while loading
  usePageMeta(gym?.name, undefined, gym ? `/gyms/${gym.id}` : '');

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--color-base)]" aria-busy>
        <div className="h-12 border-b border-[var(--color-border)]" />
        <div className="flex h-[60svh] animate-pulse items-end bg-[var(--color-base-dark)]">
          <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-12 sm:px-6">
            <div className="h-4 w-40 rounded bg-[var(--color-border)]" />
            <div className="h-16 w-4/5 max-w-xl rounded bg-[var(--color-border)]" />
          </div>
        </div>
      </main>
    );
  }
  if (isError || !gym) {
    // 404 means no such gym; anything else is worth a retry
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    if (status === 404 || status === 400) return <NotFoundPage />;
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-base)] px-4 text-center">
        <p className="text-xl font-bold text-[var(--color-deepgray)]">We couldn't load this gym</p>
        <button type="button" onClick={() => refetch()} className="btn-outline">Try again</button>
      </main>
    );
  }

  const base = gymId ? `/gyms/${gym.id}` : `/g/${slug}`;
  const site: GymSite = {
    gym,
    base,
    images: buildImages(gym),
    phone,
    joinUrl: `/register/member?gym=${gym.id}`,
  };
  const links = [
    { to: base, label: 'Overview', end: true },
    gym.plans.length > 0 && { to: `${base}/plans`, label: 'Plans' },
    gym.trainers.length > 0 && { to: `${base}/trainers`, label: 'Trainers' },
    { to: `${base}/gallery`, label: 'Gallery' },
    { to: `${base}/contact`, label: 'Contact' },
  ].filter((l): l is { to: string; label: string; end?: boolean } => Boolean(l));

  const from = cheapestPlan(gym.plans);

  return (
    <main style={gymAccent(gym.brandColor)} className="relative isolate min-h-screen overflow-x-hidden bg-[var(--color-base)] pb-28 sm:pb-24">
      <div className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-base)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <nav aria-label={`${gym.name} pages`} className="gym-site-tabs -mx-1 flex min-w-0 flex-1 overflow-x-auto overscroll-x-contain" tabIndex={0}>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `flex min-h-12 shrink-0 items-center border-b-2 px-3 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-[var(--gym-accent)] text-[var(--color-deepgray)]'
                      : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-deepgray)]'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <Link to={site.joinUrl} className="btn-primary hidden shrink-0 py-2! sm:inline-flex">
            Join now
          </Link>
        </div>
      </div>
      <div className="relative z-10"><Outlet context={site} /></div>

      {/* Phones get the join button at thumb reach on every page of the gym */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[var(--color-deepgray)]">{gym.name}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">
              {from ? `From ${formatPrice(from.price)} / ${formatDuration(from.duration)}` : gym.city}
            </p>
          </div>
          {phone && (
            <a href={`tel:${phone}`} aria-label={`Call ${gym.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-strong)] text-[var(--color-charcoal)]">
              <Phone className="h-5 w-5" />
            </a>
          )}
          <Link to={site.joinUrl} className="btn-primary min-h-11 shrink-0 px-6!">
            Join
          </Link>
        </div>
      </div>
    </main>
  );
}
