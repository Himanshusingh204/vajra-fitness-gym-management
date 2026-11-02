import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Menu, Settings, X, type LucideIcon } from 'lucide-react';
import DashboardSignOut from '../DashboardSignOut';
import NotificationsBell from '../NotificationsBell';
import { ThemeSelector } from '../ThemeSelector';
import { useAuthStore } from '../../store/useAuthStore';

// `id` is the section key the page body switches on; it reaches the page
// through the outlet context.
export type ShellLink = { to: string; id: string; label: string; icon: LucideIcon; badge?: number };
export type ShellGroup = { label: string; links: ShellLink[] };

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  groups: ShellGroup[];
  /** Up to four paths for the phone bottom bar. Everything else is under "More". */
  tabBar: string[];
  /** Shown in the top bar (in the drawer on phones), e.g. the member's gym picker. */
  switcher?: ReactNode;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 ${
    isActive
      ? 'bg-[var(--color-primary)] text-white dark:text-[var(--color-base)]'
      : 'text-[var(--color-muted)] hover:bg-[var(--color-border)]/40 hover:text-[var(--color-deepgray)] dark:hover:text-white'
  }`;

const siteLink =
  'rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-border)]/40 hover:text-[var(--color-deepgray)] dark:hover:text-white';

// Trainers and the platform admin have no account page of their own yet.
const accountPage: Record<string, { to: string; label: string }> = {
  MEMBER: { to: '/profile', label: 'Profile' },
  GYM_ADMIN: { to: '/owner/settings', label: 'Gym settings' },
};

function AccountMenu() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  // Same trick as the drawer: opening on one page means any navigation closes it.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpenPath(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPath(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const page = accountPage[user.role];

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpenPath(open ? null : pathname)}
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label="Account"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] dark:text-[var(--color-base)]"
      >
        {user.username.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div
          id="account-menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl"
        >
          <div className="mb-2 border-b border-[var(--color-border)] px-3 pb-2 pt-1">
            <p className="truncate text-sm font-bold text-[var(--color-deepgray)] dark:text-white">{user.username}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">{user.email}</p>
          </div>
          {page && (
            <Link to={page.to} onClick={() => setOpenPath(null)} className={`${siteLink} mb-1 flex items-center gap-2.5`}>
              <Settings className="h-4 w-4" aria-hidden="true" />
              {page.label}
            </Link>
          )}
          <DashboardSignOut />
        </div>
      )}
    </div>
  );
}

const PageSkeleton = () => (
  <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 sm:py-10 lg:px-8" aria-busy="true" aria-label="Loading">
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />)}
    </div>
    <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
  </div>
);

export default function DashboardShell({ title, subtitle, groups, tabBar, switcher }: Props) {
  const { pathname } = useLocation();
  // Remember which page opened the drawer, so any navigation (links, back button) closes it.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const links = groups.flatMap((g) => g.links);
  const root = links[0].to;
  const path = pathname.replace(/\/+$/, '') || '/';
  const current = links.find((l) => l.to === path);

  useEffect(() => {
    document.title = `${current?.label ?? 'Dashboard'} | Kavach Fitness`;
  }, [current?.label]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerPath(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const close = () => setDrawerPath(null);

  // Focus the drawer when it opens, and hand focus back to whichever button opened it.
  const opener = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const openDrawer = () => {
    opener.current = document.activeElement as HTMLElement | null;
    setDrawerPath(pathname);
  };
  useEffect(() => {
    if (drawerOpen) {
      closeButton.current?.focus();
    } else {
      opener.current?.focus();
      opener.current = null;
    }
  }, [drawerOpen]);

  return (
    <div className="dash min-h-dvh bg-[var(--color-base)] lg:flex">
      {drawerOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={close} aria-hidden="true" />}

      <aside
        id="dashboard-nav"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:h-dvh lg:max-w-none lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full max-lg:invisible'
        }`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border)] p-5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold text-[var(--color-deepgray)] dark:text-white">{title}</p>
            {subtitle && <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{subtitle}</p>}
            {switcher && <div className="mt-3 sm:hidden">{switcher}</div>}
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-border)]/40 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Dashboard" className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{group.label}</p>
              <div className="space-y-0.5">
                {group.links.map(({ to, label, icon: Icon, badge }) => (
                  <NavLink key={to} to={to} end={to === root} onClick={close} className={linkClass}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                    {!!badge && (
                      <span className="ml-auto shrink-0 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-950">{badge}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 sm:gap-2 sm:px-4 lg:px-6">
          <button
            type="button"
            onClick={openDrawer}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="dashboard-nav"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-border)]/40 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" aria-label="Kavach Fitness home" className="flex shrink-0 items-center gap-2 rounded-lg px-1">
            <img src="/logo.svg" alt="" width="32" height="32" className="h-8 w-auto" />
            <span className="hidden text-base font-extrabold tracking-tight text-[var(--color-deepgray)] dark:text-white xl:inline">
              Kavach<span className="text-[var(--color-primary)]">Fitness</span>
            </span>
          </Link>
          <nav aria-label="Website" className="hidden items-center md:flex">
            <Link to="/" className={siteLink}>Home</Link>
            <Link to="/gyms" className={siteLink}>Find gyms</Link>
          </nav>
          <div className="min-w-0 flex-1 px-1">
            <div className="md:hidden">
              <p className="truncate text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{title}</p>
              <p className="truncate font-extrabold leading-tight text-[var(--color-deepgray)] dark:text-white">{current?.label}</p>
            </div>
          </div>
          {switcher && <div className="hidden w-56 shrink-0 sm:block">{switcher}</div>}
          <NotificationsBell />
          <ThemeSelector />
          <AccountMenu />
        </header>

        <main className="pb-24 lg:pb-0">
          <h1 className="sr-only">{current?.label ?? title}</h1>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet context={current?.id} />
          </Suspense>
        </main>
      </div>

      <nav
        aria-label="Quick links"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {tabBar.map((to) => {
          const link = links.find((l) => l.to === to);
          if (!link) return null;
          const Icon = link.icon;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === root}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold ${
                  isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{link.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={openDrawer}
          aria-expanded={drawerOpen}
          aria-controls="dashboard-nav"
          className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold text-[var(--color-muted)]"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          More
        </button>
      </nav>
    </div>
  );
}
