import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, UserCircle, X, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ThemeSelector } from '../ThemeSelector';
import NotificationsBell from '../NotificationsBell';
import { IconButton, Menu, cx, menuItemClass } from '../ui';
import { SkipLink } from '../../layouts/MainLayout';

export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: number };
export type NavGroup = { label?: string; items: NavItem[] };

type AppShellProps = {
  nav: NavGroup[];
  /** Up to five items for the bottom tab bar on phones. */
  mobileTabs?: NavItem[];
  /** Sets the document title and the top bar label. */
  title?: string;
  children: ReactNode;
};

const COLLAPSE_KEY = 'vf-sidebar-collapsed';

function Badge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto rounded-full bg-accent px-1.5 text-xs font-semibold text-on-accent tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function NavList({ nav, collapsed = false }: { nav: NavGroup[]; collapsed?: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {nav.map((group, gi) => (
        <div key={group.label ?? gi}>
          {group.label && (
            <p className={cx('mb-1 px-3 text-xs font-semibold text-ink-muted', collapsed && 'sr-only')}>{group.label}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map(({ to, label, icon: Icon, end, badge }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cx(
                      'relative flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      isActive ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                    )
                  }
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className={cx(collapsed && 'sr-only')}>{label}</span>
                  {collapsed ? badge ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" /> : null : <Badge count={badge} />}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const ShellLogo = ({ compact = false }: { compact?: boolean }) => (
  <Link to="/" className="flex items-center gap-2.5 rounded-control">
    <img src="/logo.svg" alt="" width="28" height="28" className="size-7" />
    <span className={cx('font-extrabold tracking-tight text-ink', compact && 'sr-only')}>
      Vajra<span className="text-accent-ink">Fitness</span>
    </span>
  </Link>
);

export function AppShell({ nav, mobileTabs, title, children }: AppShellProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const drawer = useRef<HTMLDialogElement>(null);
  const hasNav = nav.some((g) => g.items.length > 0);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (title) document.title = `${title} | Vajra Fitness`;
  }, [title]);

  useEffect(() => {
    drawer.current?.close();
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* preference only */
      }
      return !c;
    });
  };

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh lg:flex">
      <SkipLink />

      {hasNav && (
        <aside
          className={cx(
            'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface lg:flex',
            collapsed ? 'w-18' : 'w-64',
          )}
        >
          <div className={cx('flex h-14 items-center px-4', collapsed && 'justify-center px-0')}>
            <ShellLogo compact={collapsed} />
          </div>
          <nav aria-label="Sections" className="flex-1 overflow-y-auto px-3 py-4">
            <NavList nav={nav} collapsed={collapsed} />
          </nav>
          <div className={cx('border-t border-line p-3', collapsed && 'flex justify-center')}>
            <IconButton
              icon={collapsed ? PanelLeftOpen : PanelLeftClose}
              label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              onClick={toggleCollapsed}
            />
          </div>
        </aside>
      )}

      {hasNav && (
        <dialog
          ref={drawer}
          aria-label="Sections"
          onClick={(e) => e.target === e.currentTarget && drawer.current?.close()}
          className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,85vw)] border-r border-line bg-surface p-0 text-ink lg:hidden"
        >
          <div className="flex h-14 items-center justify-between px-4">
            <ShellLogo />
            <IconButton icon={X} label="Close menu" onClick={() => drawer.current?.close()} />
          </div>
          <nav aria-label="Sections" className="px-3 pb-6">
            <NavList nav={nav} />
          </nav>
        </dialog>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg px-2 sm:px-4">
          {hasNav && (
            <IconButton icon={MenuIcon} label="Open menu" onClick={() => drawer.current?.showModal()} className="lg:hidden" />
          )}
          <div className={cx(hasNav && 'lg:hidden')}>
            <ShellLogo compact />
          </div>
          {title && <span className="min-w-0 truncate text-sm font-semibold text-ink">{title}</span>}
          <div className="ml-auto flex items-center gap-1">
            <ThemeSelector />
            {user && <NotificationsBell />}
            <Menu
              label="Account"
              trigger={
                <>
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink" aria-hidden="true">
                    {(user?.username ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-32 truncate text-sm font-medium text-ink sm:inline">{user?.username}</span>
                </>
              }
              triggerClassName="px-1.5"
            >
              {(close) => (
                <>
                  {user && <p className="truncate px-3 py-2 text-xs text-ink-muted">{user.email}</p>}
                  <Link to="/profile" role="menuitem" onClick={close} className={menuItemClass}>
                    <UserCircle className="size-4 text-ink-muted" aria-hidden="true" />
                    Profile
                  </Link>
                  <button type="button" role="menuitem" onClick={handleLogout} className={menuItemClass}>
                    <LogOut className="size-4 text-ink-muted" aria-hidden="true" />
                    Log out
                  </button>
                </>
              )}
            </Menu>
          </div>
        </header>

        <main id="main" tabIndex={-1} className={cx('flex-1 outline-none', Boolean(mobileTabs?.length) && 'pb-20 lg:pb-0')}>
          {children}
        </main>
      </div>

      {mobileTabs && mobileTabs.length > 0 && (
        <nav aria-label="Quick links" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${mobileTabs.length}, minmax(0, 1fr))` }}>
            {mobileTabs.map(({ to, label, icon: Icon, end, badge }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cx('relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium', isActive ? 'text-accent-ink' : 'text-ink-muted')
                  }
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                  {badge ? <span className="absolute right-[calc(50%-1rem)] top-2 size-2 rounded-full bg-accent" aria-label={`${badge} new`} /> : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
