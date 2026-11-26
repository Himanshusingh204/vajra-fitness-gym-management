import { Link } from 'react-router';
import { ArrowRight, Clock, MapPin, Navigation, Phone, Tag, type LucideIcon } from 'lucide-react';
import { Reveal } from '../../components/Reveal';
import { usePageMeta } from '../../hooks/usePageMeta';
import { formatDuration, formatPrice } from '../../utils/format';
import { cheapestPlan, fullAddress, mapsLink, splitList, useGymSite, whatsappLink } from './gymData';
import { JoinBand, PlanGrid, Section, TextLink, Timetable, TrainerList } from './shared';

const PREVIEW_PLANS = 3;
const PREVIEW_TRAINERS = 3;
const BENTO_PHOTOS = 5;

type QuickFact = { icon: LucideIcon; label: string; value: string; to?: string; href?: string; cta?: string };

// Each word lights up in turn as the paragraph scrolls past (see .scrub-word).
function ScrubText({ text }: { text: string }) {
  const words = text.split(/\s+/);
  return (
    <p className="max-w-3xl text-2xl font-semibold leading-snug tracking-tight text-[var(--color-deepgray)] md:text-3xl">
      {words.map((word, i) => (
        <span key={i} className="scrub-word" style={{ '--i': (i / words.length) * 60 } as React.CSSProperties}>
          {word}{' '}
        </span>
      ))}
    </p>
  );
}

export default function GymOverviewPage() {
  const { gym, base, images, joinUrl, phone } = useGymSite();
  usePageMeta(
    gym.name,
    `${gym.name} in ${gym.city}. ${gym.tagline ?? 'View membership plans, trainers, class timings and contact details.'}`,
    `/gyms/${gym.id}`,
  );

  const facilities = splitList(gym.facilities);
  const address = fullAddress(gym);
  const mapQuery = gym.lat != null && gym.lng != null ? `${gym.lat},${gym.lng}` : address;
  const about = gym.description ?? gym.tagline;
  const from = cheapestPlan(gym.plans);
  const cover = images[0]!;
  const bento = images.slice(0, BENTO_PHOTOS);

  // The four things people look for first, each one tap away
  const quick = ([
    gym.openingHours && { icon: Clock, label: 'Timings', value: gym.openingHours },
    from && { icon: Tag, label: 'Plans from', value: `${formatPrice(from.price)} / ${formatDuration(from.duration)}`, to: `${base}/plans` },
    { icon: MapPin, label: 'Address', value: gym.location || gym.city, href: mapsLink(mapQuery), cta: 'Directions' },
    phone && { icon: Phone, label: 'Phone', value: phone, href: `tel:${phone}`, cta: 'Call' },
  ] as (QuickFact | false | null | '')[]).filter((q): q is QuickFact => Boolean(q));

  return (
    <>
      <section className="relative isolate flex min-h-[64svh] items-end overflow-hidden bg-[var(--color-section-dark)] sm:min-h-[76svh]">
        <img src={cover.src} alt={cover.alt} fetchPriority="high" className="gym-hero-photo absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/50 to-transparent" />
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24">
          <Reveal>
            <p className="flex items-center gap-3 text-sm font-semibold text-white/85">
              {gym.logoUrl ? (
                <img src={gym.logoUrl} alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
              ) : (
                <span aria-hidden="true" className="h-1 w-10 rounded-full bg-[var(--gym-accent)]" />
              )}
              {gym.location || `${gym.city}, ${gym.state}`}
            </p>
            <h1 className="mt-4 max-w-5xl break-words font-display text-[clamp(3.5rem,11vw,8.5rem)] uppercase leading-[0.86] tracking-wide text-white">
              {gym.name}
            </h1>
            {gym.tagline && <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">{gym.tagline}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={gym.plans.length ? `${base}/plans` : joinUrl} className="btn-primary group min-h-12 px-6!">
                {gym.plans.length ? 'See plans and prices' : 'Join this gym'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
              </Link>
              <a
                href={mapsLink(mapQuery)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/40 px-5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Navigation className="h-4 w-4" /> Directions
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <dl
          id="gym-details"
          className="relative -mt-8 grid scroll-mt-36 divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_18px_40px_-30px_rgba(0,0,0,0.5)] md:grid-flow-col md:auto-cols-fr md:divide-x md:divide-y-0"
        >
          {quick.map((q) => {
            const body = (
              <>
                <q.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">{q.label}</dt>
                  <dd className="mt-1 break-words font-semibold leading-snug text-[var(--color-deepgray)]">{q.value}</dd>
                </div>
                {(q.to || q.href) && (
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
                    {q.cta ?? 'View'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                )}
              </>
            );
            const row = 'group flex min-h-16 items-start gap-3 px-5 py-4';
            const linkRow = `${row} transition-colors hover:bg-[var(--color-base)]`;
            return q.to ? (
              <Link key={q.label} to={q.to} className={linkRow}>{body}</Link>
            ) : q.href ? (
              <a key={q.label} href={q.href} {...(q.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})} className={linkRow}>{body}</a>
            ) : (
              <div key={q.label} className={row}>{body}</div>
            );
          })}
        </dl>

        {gym.plans.length > 0 && (
          <Section title="Membership plans" action={gym.plans.length > PREVIEW_PLANS && <TextLink to={`${base}/plans`}>All {gym.plans.length} plans</TextLink>}>
            <PlanGrid plans={gym.plans} limit={PREVIEW_PLANS} />
          </Section>
        )}

        <Section title="Inside the gym" action={<TextLink to={`${base}/gallery`}>All photos</TextLink>}>
          {facilities.length > 0 && (
            <ul aria-label="Facilities" className="mb-8 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {facilities.map((f, i) => (
                <li key={f} className="flex items-baseline gap-4 border-b border-[var(--color-border)] py-3.5">
                  <span aria-hidden="true" className="w-6 shrink-0 font-display text-lg tabular-nums text-[var(--color-muted)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="break-words text-lg font-semibold text-[var(--color-deepgray)]">{f}</span>
                </li>
              ))}
            </ul>
          )}
          {/* 2x2 lead photo + 1x1 tiles; with four photos the last one spans two columns so the grid has no holes. */}
          <div className="grid grid-flow-dense auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-4">
            {bento.map((img, i) => (
              <Link
                key={img.src}
                to={`${base}/gallery`}
                aria-label={`Open the photo gallery, photo ${i + 1}`}
                className={`group block overflow-hidden rounded-2xl bg-[var(--color-base-dark)] ${
                  i === 0 ? 'col-span-2 row-span-2' : i === 3 && bento.length === 4 ? 'col-span-2' : ''
                }`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="scroll-photo h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
                />
              </Link>
            ))}
          </div>
        </Section>

        {about && (
          <Section title="About the gym">
            <ScrubText text={about} />
          </Section>
        )}

        {(gym.parking || gym.accessibility || gym.rules) && (
          <Section title="Good to know">
            <dl className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {([['Parking', gym.parking], ['Accessibility', gym.accessibility], ['Gym guidelines', gym.rules]] as const).filter(([, value]) => value).map(([label, value]) => (
                <div key={label} className="border-b border-[var(--color-border)] py-5">
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">{label}</dt>
                  <dd className="mt-2 whitespace-pre-line text-base leading-relaxed text-[var(--color-charcoal)]">{value}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {gym.trainers.length > 0 && (
          <Section title="Trainers" action={gym.trainers.length > PREVIEW_TRAINERS && <TextLink to={`${base}/trainers`}>All trainers</TextLink>}>
            <TrainerList trainers={gym.trainers} limit={PREVIEW_TRAINERS} />
          </Section>
        )}

        {gym.classes.length > 0 && (
          <Section title="Class timetable">
            <Timetable classes={gym.classes} />
          </Section>
        )}

        <Section title="Find us">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="min-w-0">
              <p className="max-w-xl break-words text-xl font-semibold leading-snug text-[var(--color-deepgray)]">{address}</p>
              {gym.openingHours && <p className="mt-2 text-[var(--color-muted)]">Open {gym.openingHours}</p>}
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={mapsLink(mapQuery)} target="_blank" rel="noreferrer" className="btn-primary min-h-11">
                <Navigation className="h-4 w-4" /> Directions
              </a>
              {phone && (
                <a href={whatsappLink(phone)} target="_blank" rel="noreferrer" className="btn-outline min-h-11">
                  WhatsApp
                </a>
              )}
              <Link to={`${base}/contact`} className="btn-outline min-h-11">
                Send a message
              </Link>
            </div>
          </div>
        </Section>

        <JoinBand gym={gym} joinUrl={joinUrl} />
      </div>
    </>
  );
}
