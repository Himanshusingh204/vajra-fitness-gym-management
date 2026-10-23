import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, PageHeader } from './ui';
import { pageSeo, useRouteMeta } from '../hooks/usePageMeta';

const TOOL_PATHS = [
  '/tools/bmi-calculator',
  '/tools/calorie-calculator',
  '/tools/one-rep-max-calculator',
  '/tools/protein-calculator',
];

type ToolLayoutProps = {
  path: string;
  form: ReactNode;
  /** Shown beside the form; announced to screen readers when it changes. */
  result: ReactNode;
  notes: ReactNode;
};

export function ToolLayout({ path, form, result, notes }: ToolLayoutProps) {
  const seo = pageSeo[path];
  useRouteMeta(path, [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: seo.h1,
      description: seo.description,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    },
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title={seo.h1} description={seo.summary} />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>{form}</Card>
        <Card className="bg-surface-sunken" aria-live="polite">
          {result}
        </Card>
      </div>
      <div className="mt-10 max-w-[65ch] space-y-3 leading-relaxed text-ink-muted">{notes}</div>
      <nav aria-label="More tools" className="mt-12 border-t border-line pt-6">
        <h2 className="text-sm font-semibold text-ink">More tools</h2>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {TOOL_PATHS.filter((p) => p !== path).map((p) => (
            <li key={p}>
              <Link to={p} className="inline-flex min-h-9 items-center font-medium text-accent-ink underline underline-offset-2">
                {pageSeo[p].name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function ResultNumber({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="text-4xl font-extrabold tracking-tight text-ink tabular-nums">
        {value}
        {unit && <span className="ml-1 text-lg font-semibold text-ink-muted">{unit}</span>}
      </p>
    </div>
  );
}

export function ResultEmpty() {
  return <p className="text-ink-muted">Fill in the form and your result shows up here.</p>;
}
