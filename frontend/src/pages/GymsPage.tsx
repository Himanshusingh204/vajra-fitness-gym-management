import { ArrowDown, ArrowRight, BadgeCheck, MapPin, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '../utils/routes';
import { GymDirectory } from '../components/GymDirectory';
import { Reveal } from '../components/Reveal';
import { usePageMeta } from '../hooks/usePageMeta';

const GymsPage = () => {
  usePageMeta(
    'Find a Gym Near You',
    'Browse verified partner gyms across India, compare membership plans, facilities and locations, and join your nearest training home.',
    '/gyms',
  );
  return (
    <div className="overflow-x-hidden bg-[var(--color-base)]">
      <section className="relative isolate flex min-h-[34rem] items-end overflow-hidden bg-[#101112] pb-14 pt-36 sm:min-h-[39rem] sm:pb-20 md:items-center md:pb-16 md:pt-32">
        <img src="/gym/hero.webp" alt="" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/65 to-black/20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 via-transparent to-black/15" />
        <div className="mx-auto grid w-full max-w-7xl items-end gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:px-8">
          <div className="max-w-3xl">
            <Reveal>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-white/75">
                <span className="h-px w-8 bg-[#f28b91]" />
                The Kavach gym network
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="display mt-5 text-5xl leading-[0.95] text-white sm:text-6xl md:text-7xl lg:text-8xl">
                Find your <span className="text-[#f28b91]">training home.</span>
              </h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
                Real gyms, local coaches and plans that fit your routine. Explore what is nearby, then join when you are ready.
              </p>
            </Reveal>
            <Reveal delay={220} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#gym-directory" className="btn-primary justify-center px-6! py-3.5! text-base">
                Explore partner gyms <ArrowDown className="h-4 w-4" />
              </a>
              <Link to={ROUTES.partnerRegister} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                List your gym <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
          <Reveal delay={260} className="hidden lg:block">
            <div className="rounded-2xl border border-white/20 bg-black/35 p-5 text-white shadow-2xl backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Find your fit</p>
              <div className="mt-5 space-y-4">
                <p className="flex items-center gap-3 text-sm font-medium"><BadgeCheck className="h-5 w-5 text-[#f28b91]" />Verified partner gyms</p>
                <p className="flex items-center gap-3 text-sm font-medium"><SlidersHorizontal className="h-5 w-5 text-[#f28b91]" />Compare plans and facilities</p>
                <p className="flex items-center gap-3 text-sm font-medium"><MapPin className="h-5 w-5 text-[#f28b91]" />Explore gyms near you</p>
              </div>
              <a href="#gym-directory" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                Browse the directory <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="gym-directory" className="scroll-mt-24 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 border-b border-[var(--color-border)] pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">Explore by location</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--color-deepgray)] sm:text-4xl">Partner gyms</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted)] sm:text-base">Compare the spaces, facilities and membership plans before you decide.</p>
            </div>
            <a href="#gym-directory" className="hidden shrink-0 text-sm font-semibold text-[var(--color-primary)] hover:underline sm:inline-flex">Search the directory</a>
          </div>
          <GymDirectory />
        </div>
      </section>
    </div>
  );
};

export default GymsPage;
