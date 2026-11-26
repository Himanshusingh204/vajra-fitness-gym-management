import { Link } from 'react-router';
import { ArrowRight, Compass } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta('Page not found', 'Find your way back to Kavach Fitness.');
  return (
    <section className="bg-[var(--color-base)] px-6 pb-24 pt-36 sm:pt-44">
      <div className="mx-auto grid min-h-[55vh] max-w-6xl items-center gap-12 md:grid-cols-[0.8fr_1fr] md:gap-20">
        <div aria-hidden="true" className="border-y border-[var(--color-border)] py-6 md:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Kavach Fitness / 404</p>
          <p className="display mt-4 text-[clamp(7rem,24vw,18rem)] leading-[0.8] text-[var(--color-primary)]">404</p>
        </div>
        <div className="max-w-lg">
          <span className="eyebrow">Let's get you back</span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[var(--color-deepgray)] dark:text-white sm:text-5xl">We couldn't find that page.</h1>
          <p className="mt-5 text-lg leading-relaxed text-[var(--color-muted)]">The address may have changed, or the page may no longer be available. Choose where you'd like to go next.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/" className="btn-primary">Go to homepage <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/gyms" className="btn-outline"><Compass className="h-4 w-4" /> Find a gym</Link>
          </div>
          <p className="mt-8 text-sm text-[var(--color-muted)]">Need help? <Link to="/help" className="font-semibold text-[var(--color-primary)] underline underline-offset-4">Visit the help centre</Link>.</p>
        </div>
      </div>
    </section>
  );
}
