import type { ReactNode } from 'react';
import { useRouteMeta, pageSeo } from '../hooks/usePageMeta';

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

type LegalPageProps = { path: string; updated: string; intro?: string; children: ReactNode };

export function LegalPage({ path, updated, intro, children }: LegalPageProps) {
  useRouteMeta(path);
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{pageSeo[path].h1}</h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated {updated}</p>
      {intro && <p className="mt-6 leading-relaxed text-ink-muted">{intro}</p>}
      {children}
    </article>
  );
}
