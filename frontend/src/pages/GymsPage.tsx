import { ArrowDown, ArrowRight } from 'lucide-react';
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
      <section className="relative overflow-hidden pb-20 pt-36 md:pb-24 md:pt-44">
        <div className="absolute inset-0" aria-hidden="true">
          <img src="/gym/hero.webp" alt="" fetchPriority="high" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-base)]/75 via-[var(--color-base)]/55 to-[var(--color-base)] dark:from-[#0d0d0d]/85 dark:via-[#0d0d0d]/70 dark:to-[#0d0d0d]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <span className="eyebrow">The Kavach gym network</span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="display mt-6 text-4xl leading-[1.02] sm:text-6xl md:text-7xl">
                Find your gym.<br /><span className="text-[var(--color-primary)]">Find your strength.</span>
              </h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-[var(--color-muted)] md:text-xl">
                Explore gyms in your city, compare facilities and plans, and find a space that fits your routine.
              </p>
            </Reveal>
            <Reveal delay={220} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#gym-directory" className="btn-primary w-full justify-center px-8! py-4! text-lg sm:w-auto">
                Explore partner gyms <ArrowDown className="h-4 w-4" />
              </a>
              <Link to={ROUTES.partnerRegister} className="btn-ghost w-full justify-center px-8! py-4! text-lg sm:w-auto">
                List your gym <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="gym-directory" className="scroll-mt-24 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 border-b border-[var(--color-border)] pb-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">Explore by location</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--color-deepgray)] sm:text-4xl">Partner gyms</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted)] sm:text-base">Compare the spaces, facilities and membership plans before you decide.</p>
            </div>
          </div>
          <GymDirectory />
        </div>
      </section>
    </div>
  );
};

export default GymsPage;
