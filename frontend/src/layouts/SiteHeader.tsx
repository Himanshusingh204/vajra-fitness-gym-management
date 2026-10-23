import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Menu as MenuIcon, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { homeForRole } from '../utils/roleHome';
import { ThemeSelector } from '../components/ThemeSelector';
import NotificationsBell from '../components/NotificationsBell';
import { Button, IconButton, cx } from '../components/ui';

const LINKS = [
  ['Gyms', '/gyms'],
  ['Membership', '/membership'],
  ['Pricing', '/subscription'],
  ['Tools', '/tools'],
  ['About', '/about'],
  ['Help', '/help'],
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cx('rounded-control px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-accent-ink' : 'text-ink hover:text-accent-ink');

export function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-control">
      <img src="/logo.svg" alt="" width="32" height="32" className="size-8" />
      <span className="text-lg font-extrabold tracking-tight text-ink">
        Vajra<span className="text-accent-ink">Fitness</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate('/login');
  };

  const actions = user ? (
    <>
      <Button to={homeForRole(user.role)} size="sm">Dashboard</Button>
      <Button variant="ghost" size="sm" onClick={handleLogout}>Log out</Button>
    </>
  ) : (
    <>
      <Button to="/login" variant="ghost" size="sm">Log in</Button>
      <Button to="/register" size="sm">Sign up</Button>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {LINKS.map(([label, to]) => (
            <NavLink key={to} to={to} className={linkClass}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeSelector />
          {user && <NotificationsBell />}
          <div className="hidden items-center gap-2 pl-2 lg:flex">{actions}</div>
          <IconButton
            icon={open ? X : MenuIcon}
            label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden"
          />
        </div>
      </div>
      {open && (
        <nav id="site-menu" aria-label="Main" className="border-t border-line bg-bg px-4 pb-4 lg:hidden">
          <ul className="py-2">
            {LINKS.map(([label, to]) => (
              <li key={to}>
                <NavLink to={to} className={({ isActive }) => cx(linkClass({ isActive }), 'flex min-h-11 items-center')}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">{actions}</div>
        </nav>
      )}
    </header>
  );
}
