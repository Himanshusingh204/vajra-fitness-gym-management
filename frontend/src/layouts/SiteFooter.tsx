import { Link } from 'react-router';
import { Logo } from './SiteHeader';

const COLUMNS = {
  Product: [
    ['Find a gym', '/gyms'],
    ['Membership', '/membership'],
    ['Pricing', '/subscription'],
    ['Fitness tools', '/tools'],
    ['Register your gym', '/register/partner'],
  ],
  Company: [
    ['About', '/about'],
    ['Help centre', '/help'],
    ['FAQ', '/faq'],
    ['Contact', '/contact'],
  ],
};

const LEGAL = [
  ['Terms', '/terms'],
  ['Privacy', '/privacy'],
  ['Cookies', '/cookies'],
  ['Refunds', '/refund'],
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-muted">Gym management for Indian fitness businesses.</p>
        </div>
        {Object.entries(COLUMNS).map(([heading, links]) => (
          <div key={heading}>
            <h2 className="text-sm font-semibold text-ink">{heading}</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="inline-flex min-h-9 items-center text-ink-muted hover:text-accent-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>&copy; {new Date().getFullYear()} Vajra Fitness</span>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {LEGAL.map(([label, to]) => (
              <li key={to}>
                <Link to={to} className="hover:text-accent-ink">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
