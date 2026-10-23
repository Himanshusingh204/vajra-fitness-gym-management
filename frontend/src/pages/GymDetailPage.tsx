import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Building2, Check, MapPin } from 'lucide-react';
import api from '../services/api';
import { Button, Card, EmptyState, ImagePanel, Skeleton } from '../components/ui';
import { splitFacilities } from '../utils/facilities';
import { SITE_URL, usePageMeta } from '../hooks/usePageMeta';
import { formatDuration, formatPrice } from '../utils/format';

type PublicGym = {
  id: string;
  name: string;
  tagline: string | null;
  address: string;
  city: string;
  state: string;
  location: string | null;
  facilities: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  branches: { id: string; name: string; city: string }[];
  plans: { id: string; name: string; description: string | null; price: number; duration: number }[];
  trainerCount: number;
  trainers: { name: string; specialization: string | null; experienceYears: number | null }[];
};

const getPublicGym = (gymId: string) => api.get<PublicGym>(`/public/gyms/${gymId}`).then((r) => r.data);

const gymJsonLd = (gym: PublicGym) => ({
  '@context': 'https://schema.org',
  '@type': 'ExerciseGym',
  name: gym.name,
  url: `${SITE_URL}/gyms/${gym.id}`,
  ...(gym.tagline ? { description: gym.tagline } : {}),
  ...(gym.imageUrl ? { image: gym.imageUrl } : {}),
  address: {
    '@type': 'PostalAddress',
    streetAddress: gym.address,
    addressLocality: gym.city,
    addressRegion: gym.state,
    addressCountry: 'IN',
  },
  amenityFeature: splitFacilities(gym.facilities).map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true })),
});

export default function GymDetailPage() {
  const { gymId = '' } = useParams();
  const { data: gym, isLoading, isError, error } = useQuery({
    queryKey: ['public-gym', gymId],
    queryFn: () => getPublicGym(gymId),
    retry: false,
    staleTime: 60_000,
  });

  const notFound = isError && (error as { response?: { status?: number } }).response?.status !== undefined;
  usePageMeta(
    gym ? `${gym.name}, ${gym.city}` : 'Gym details',
    gym
      ? `${gym.name} in ${gym.city}, ${gym.state}. See membership plans, facilities and trainers, then join online.`
      : 'Gym details on Vajra Fitness.',
    `/gyms/${gymId}`,
    { noindex: !gym, image: gym?.imageUrl ?? undefined, jsonLd: gym ? [gymJsonLd(gym)] : undefined },
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title={notFound ? 'This gym is not listed' : 'Could not load this gym'}
          description={notFound ? 'It may have been removed or is still waiting for approval.' : 'Check your connection and reload the page.'}
          action={<Button to="/gyms">Browse all gyms</Button>}
        />
      </div>
    );
  }

  const facilities = splitFacilities(gym.facilities);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link to="/gyms" className="hover:text-accent-ink">Gyms</Link> / <span className="text-ink">{gym.name}</span>
      </nav>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{gym.name}</h1>
          {gym.tagline && <p className="mt-2 max-w-[60ch] text-lg text-ink-muted">{gym.tagline}</p>}
          <p className="mt-3 flex items-start gap-2 text-ink-muted">
            <MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />
            {gym.address}, {gym.city}, {gym.state}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button to={`/register/member?gym=${gym.id}`} size="lg">Join this gym</Button>
          <Button to={`/register/trainer?gym=${gym.id}`} variant="secondary" size="lg">Apply as trainer</Button>
        </div>
      </header>

      <ImagePanel
        src={gym.imageUrl ?? undefined}
        alt={`Inside ${gym.name}`}
        width={1200}
        height={560}
        priority
        label={`Photo of ${gym.name}`}
        className="mt-8"
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="plans">
          <h2 id="plans" className="text-xl font-bold tracking-tight text-ink">Membership plans</h2>
          {gym.plans.length === 0 ? (
            <p className="mt-3 text-ink-muted">This gym has not listed plans yet. Join to ask the front desk.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {gym.plans.map((plan) => (
                <li key={plan.id}>
                  <Card className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink">{plan.name}</h3>
                      {plan.description && <p className="mt-1 text-sm text-ink-muted">{plan.description}</p>}
                    </div>
                    <p className="shrink-0 text-right">
                      <span className="text-lg font-bold text-ink">{formatPrice(plan.price)}</span>
                      <span className="block text-sm text-ink-muted">{formatDuration(plan.duration)}</span>
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {gym.trainers.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-bold tracking-tight text-ink">Trainers</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {gym.trainers.map((t) => (
                  <li key={t.name} className="rounded-card border border-line bg-surface p-4">
                    <p className="font-semibold text-ink">{t.name}</p>
                    <p className="text-sm text-ink-muted">
                      {[t.specialization, t.experienceYears ? `${t.experienceYears} years` : null].filter(Boolean).join(', ') || 'Trainer'}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <aside className="space-y-8">
          {facilities.length > 0 && (
            <section aria-labelledby="facilities">
              <h2 id="facilities" className="text-xl font-bold tracking-tight text-ink">Facilities</h2>
              <ul className="mt-3 space-y-2">
                {facilities.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-ink-muted">
                    <Check className="size-4 shrink-0 text-success-ink" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {gym.branches.length > 1 && (
            <section aria-labelledby="branches">
              <h2 id="branches" className="text-xl font-bold tracking-tight text-ink">Branches</h2>
              <ul className="mt-3 space-y-2">
                {gym.branches.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 text-ink-muted">
                    <Building2 className="size-4 shrink-0" aria-hidden="true" />
                    {b.name}, {b.city}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
