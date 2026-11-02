import { Link, NavLink, Outlet, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getPublicGym, getPublicSite } from '../api/gym.api';
import { usePageMeta } from '../hooks/usePageMeta';
import { SITE_URL } from '../utils/constants';
import NotFoundPage from './NotFoundPage';
import { buildImages, useGymJsonLd, type GymSite } from './gym-site/gymData';

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
      <main className="min-h-screen bg-[var(--color-base)] pt-32" aria-busy>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-border)]" />
            <div className="h-14 w-4/5 animate-pulse rounded bg-[var(--color-border)]" />
            <div className="h-5 w-3/5 animate-pulse rounded bg-[var(--color-border)]" />
          </div>
          <div className="aspect-[4/3] animate-pulse rounded-xl bg-[var(--color-border)]" />
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

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-[var(--color-base)] pb-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[34rem] overflow-hidden" aria-hidden="true">
        <img src="/gym/hero.webp" alt="" className="h-full w-full object-cover opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-base)]/70 via-[var(--color-base)]/85 to-[var(--color-base)]" />
      </div>
      <div className="sticky top-0 z-40 border-y border-[var(--color-border)] bg-[var(--color-base)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <nav aria-label={`${gym.name} pages`} className="gym-site-tabs -mx-1 flex min-w-0 flex-1 overflow-x-auto overscroll-x-contain" tabIndex={0}>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `shrink-0 border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-[var(--color-primary)] text-[var(--color-deepgray)]'
                      : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-deepgray)]'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <Link to={site.joinUrl} className="btn-primary shrink-0 py-2!">
            Join now
          </Link>
        </div>
      </div>
      <div className="relative z-10"><Outlet context={site} /></div>
    </main>
  );
}
