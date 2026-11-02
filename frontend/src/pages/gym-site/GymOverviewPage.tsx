import { Link } from 'react-router';
import { ArrowDown, ArrowRight, BadgeCheck, MapPin } from 'lucide-react';
import { Reveal } from '../../components/Reveal';
import { usePageMeta } from '../../hooks/usePageMeta';
import { mapsLink, splitList, useGymSite } from './gymData';
import { JoinBand, PlanGrid, Section, TextLink, Timetable, TrainerList } from './shared';

const PREVIEW_PLANS = 3;
const PREVIEW_TRAINERS = 3;
const BENTO_PHOTOS = 5;

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
  const { gym, base, images, joinUrl } = useGymSite();
  usePageMeta(
    gym.name,
    `${gym.name} in ${gym.city}. ${gym.tagline ?? 'View membership plans, trainers, class timings and contact details.'}`,
    `/gyms/${gym.id}`,
  );

  const facilities = splitList(gym.facilities);
  const fullAddress = `${gym.address}, ${gym.city}, ${gym.state}`;
  const about = gym.description ?? gym.tagline;
  const facts = [
    { label: 'Location', value: `${gym.city}, ${gym.state}` },
    gym.openingHours && { label: 'Open', value: gym.openingHours },
    gym.trainers.length > 0 && { label: 'Trainers', value: String(gym.trainers.length) },
    facilities.length > 0 && { label: 'Facilities', value: String(facilities.length) },
  ].filter((f): f is { label: string; value: string } => Boolean(f));

  const cover = images[0]!;
  const bento = images.slice(0, BENTO_PHOTOS);

  return (
    <>
      <section className="relative isolate -mt-px flex min-h-[85svh] items-end overflow-hidden bg-[#0d0d0d] sm:items-center">
        <img src={cover.src} alt={cover.alt} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-80 contrast-110" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.85)_75%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-[var(--color-base)] via-black/40 to-transparent" />
        <Reveal className="mx-auto w-full max-w-6xl px-4 pb-20 pt-28 text-center sm:px-6 sm:pb-24">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
            <MapPin className="h-4 w-4 text-[#f28b91]" /> {gym.city}, {gym.state}
          </p>
          <h1 className="mx-auto mt-4 max-w-5xl break-words font-display text-[clamp(3rem,7vw,6.5rem)] uppercase leading-[0.92] tracking-wide text-white">
            {gym.name}
          </h1>
          {gym.tagline && <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl">{gym.tagline}</p>}
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={gym.plans.length ? `${base}/plans` : joinUrl} className="btn-primary group min-h-12 justify-center px-7!">
              {gym.plans.length ? 'Explore membership plans' : 'Join this gym'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
            <Link
              to={`${base}/contact`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-7 font-semibold text-white transition-colors hover:bg-white hover:text-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Ask the gym
            </Link>
          </div>
          <a href="#gym-details" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white">
            Get to know the gym <ArrowDown className="h-4 w-4" />
          </a>
        </Reveal>
      </section>

    <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
      <dl id="gym-details" className="relative -mt-10 grid scroll-mt-36 grid-cols-2 gap-x-5 gap-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-6 shadow-sm sm:grid-cols-4 sm:px-7">
        {facts.map((f) => (
          <div key={f.label} className="pr-4">
            <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">{f.label}</dt>
            <dd className="mt-1.5 break-words text-base font-bold leading-snug text-[var(--color-deepgray)] sm:text-lg">{f.value}</dd>
          </div>
        ))}
        <p className="col-span-2 inline-flex items-center gap-2 border-t border-[var(--color-border)] pt-4 text-sm font-semibold text-[var(--color-secondary)] sm:col-span-4">
          <BadgeCheck className="h-4 w-4" /> Verified partner gym on Kavach Fitness
        </p>
      </dl>

      {(about || facilities.length > 0) && (
        <Section title="About">
          <div className="grid gap-10 md:grid-cols-5">
            {about && <div className="md:col-span-3"><ScrubText text={about} /></div>}
            {facilities.length > 0 && (
              <ul className={`flex flex-wrap content-start gap-2 ${about ? 'md:col-span-2' : 'md:col-span-5'}`}>
                {facilities.map((f) => (
                  <li key={f} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-charcoal)]">
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}

      {gym.plans.length > 0 && (
        <Section title="Membership plans" action={gym.plans.length > PREVIEW_PLANS && <TextLink to={`${base}/plans`}>All plans</TextLink>}>
          <PlanGrid plans={gym.plans} limit={PREVIEW_PLANS} />
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

      <Section title="Inside the gym" action={<TextLink to={`${base}/gallery`}>View full gallery</TextLink>}>
        {/* 2x2 lead photo + 1x1 tiles; with four photos the last one spans two columns so the grid has no holes. */}
        <div className="grid grid-flow-dense auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-4">
          {bento.map((img, i) => (
            <Link
              key={img.src}
              to={`${base}/gallery`}
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

      <Section title="Find us">
        <a
          href={mapsLink(fullAddress)}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex max-w-xl items-start gap-3 text-lg text-[var(--color-deepgray)]"
        >
          <MapPin className="mt-1 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
          <span className="break-words underline decoration-[var(--color-border-strong)] underline-offset-4 group-hover:decoration-[var(--color-primary)]">
            {fullAddress}
          </span>
        </a>
        <div className="mt-5">
          <TextLink to={`${base}/contact`}>Contact details</TextLink>
        </div>
      </Section>

      <JoinBand gym={gym} joinUrl={joinUrl} />
    </div>
    </>
  );
}
