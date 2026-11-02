import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

export type Crumb = { label: string; to?: string };

type Props = {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
};

// DashboardShell already renders the page's h1 (visually hidden, from the nav
// label), so the visible title here is an h2.
export default function PageHeader({ title, description, breadcrumbs, actions }: Props) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-muted)]">
              {breadcrumbs.map((c, i) => {
                const last = i === breadcrumbs.length - 1;
                return (
                  <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                    {c.to && !last ? (
                      <Link to={c.to} className="inline-flex min-h-11 items-center hover:text-[var(--color-deepgray)] hover:underline sm:min-h-0">
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current={last ? 'page' : undefined}>{c.label}</span>
                    )}
                    {!last && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <h2 className="truncate text-2xl font-extrabold text-[var(--color-deepgray)]">{title}</h2>
        {description && <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
