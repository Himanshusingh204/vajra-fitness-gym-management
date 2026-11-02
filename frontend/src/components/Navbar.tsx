import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, X, LogOut, LayoutDashboard, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { ROUTES, dashboardFor } from '../utils/routes';
import { ThemeSelector } from './ThemeSelector';
import NotificationsBell from './NotificationsBell';

const NAV_LINKS = [
  ['Home', '/'],
  ['Gyms', '/gyms'],
  ['Membership', '/membership'],
  ['About', '/about'],
  ['Contact', '/contact'],
  ['Help', '/help'],
] as const;

const menuItem =
  'flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 focus-visible:bg-[var(--color-primary)]/10 outline-none';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const routeKey = location.pathname + location.hash;
  const [seenRoute, setSeenRoute] = useState(routeKey);
  if (seenRoute !== routeKey) {
    setSeenRoute(routeKey);
    setMobileOpen(false);
    setMenuOpen(false);
  }
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useThemeStore();
  const isDark = theme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  const queryClient = useQueryClient();

  useEffect(() => {
    let lastY = window.scrollY;
    let rafId = 0;
    // Batch scroll-driven state updates to at most once per animation frame.
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const y = window.scrollY;
        setScrolled(y > 16);
        setHidden(y > 140 && y > lastY);
        lastY = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      menuRef.current?.querySelector('button')?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const dashboardPath = user ? dashboardFor(user.role) : '/dashboard';

  const handleLogout = useCallback(() => {
    // Drop all cached queries so the next session can't see stale data.
    queryClient.clear();
    logout();
    navigate(ROUTES.login);
  }, [logout, navigate, queryClient]);

  const isActive = useCallback(
    (path: string) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    [location.pathname],
  );

  const navClass = `fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
    hidden && !mobileOpen && !menuOpen ? '-translate-y-full' : 'translate-y-0'
  }`;

  const barClass = scrolled
    ? 'bg-white/70 dark:bg-[var(--color-base)]/70 backdrop-blur-2xl border border-[var(--color-border)] shadow-[0_8px_32px_rgba(0,0,0,0.08)] mt-4 mx-4 lg:mx-auto max-w-7xl rounded-2xl'
    : 'bg-transparent border border-transparent mt-4 mx-4 lg:mx-auto max-w-7xl';

  return (
    <nav className={navClass}>
      <div className={`transition-all duration-500 ${barClass}`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-[72px]">

            <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
              <img src="/logo.svg" alt="" width="40" height="40" className="h-9 w-auto shrink-0" />
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--color-deepgray)] dark:text-white truncate">
                Kavach<span className="text-[var(--color-primary)]">Fitness</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              {NAV_LINKS.map(([label, path]) => (
                <Link
                  key={path}
                  to={path}
                  className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(path) ? 'text-[var(--color-primary)]' : 'text-[var(--color-charcoal)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <NotificationsBell />
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen((o) => !o)}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      aria-label="Account menu"
                      className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white font-bold text-sm flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </button>
                    {menuOpen && (
                      <div role="menu" className="absolute right-0 top-12 w-60 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl p-2">
                        <div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
                          <p className="text-sm font-bold text-[var(--color-deepgray)] truncate">{user.username}</p>
                          <p className="text-xs text-[var(--color-muted)] truncate">{user.email}</p>
                        </div>
                        <Link role="menuitem" to={dashboardPath} className={menuItem}>
                          <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </Link>
                        <button role="menuitem" onClick={toggleTheme} className={menuItem}>
                          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                          {isDark ? 'Light theme' : 'Dark theme'}
                        </button>
                        <button role="menuitem" onClick={handleLogout} className={`${menuItem} text-red-600 dark:text-red-400`}>
                          <LogOut className="w-4 h-4" /> Log out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <ThemeSelector />
                  <Link
                    to={ROUTES.login}
                    className="text-sm font-semibold text-[var(--color-charcoal)] hover:text-[var(--color-primary)] transition-colors px-3 py-2"
                  >
                    Log in
                  </Link>
                  <Link to={ROUTES.partnerRegister} className="btn-primary px-5! py-2.5! text-sm">
                    Get started
                  </Link>
                </>
              )}
            </div>

            <div className="md:hidden flex items-center gap-1 shrink-0">
              {user && <NotificationsBell />}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileOpen}
                className="p-2 rounded-lg text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden absolute top-20 left-4 right-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(([label, path]) => (
              <Link
                key={path}
                to={path}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(path)
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
                }`}
              >
                {label}
              </Link>
            ))}

            <div className="border-t border-[var(--color-border)] pt-3 mt-2 flex flex-col gap-2">
              {user ? (
                <>
                  <Link to={dashboardPath} className="btn-primary text-center text-sm">Dashboard</Link>
                  <button onClick={toggleTheme} className="text-sm text-[var(--color-charcoal)] py-2">
                    {isDark ? 'Light theme' : 'Dark theme'}
                  </button>
                  <button onClick={handleLogout} className="text-sm text-red-600 dark:text-red-400 py-2">Log out</button>
                </>
              ) : (
                <>
                  <Link to={ROUTES.login} className="text-sm text-center text-[var(--color-charcoal)] py-2">Log in</Link>
                  <Link to={ROUTES.partnerRegister} className="btn-primary text-center text-sm">Get started</Link>
                  <button onClick={toggleTheme} className="text-sm text-[var(--color-muted)] py-2">
                    {isDark ? 'Light theme' : 'Dark theme'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
