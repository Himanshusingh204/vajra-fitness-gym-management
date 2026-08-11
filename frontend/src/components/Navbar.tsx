import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, X, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeSelector } from './ThemeSelector';
import NotificationsBell from './NotificationsBell';

const ABOUT_LINKS = [
  { label: 'Company', slug: 'company' },
  { label: 'Mission & Vision', slug: 'mission-vision' },
  { label: 'Team', slug: 'team' },
  { label: 'Careers', slug: 'careers' },
  { label: 'Partners', slug: 'partners' },
  { label: 'Awards', slug: 'awards' },
  { label: 'FAQ', slug: 'faq' },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  // Close the About dropdown when clicking/tapping outside of it.
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (aboutRef.current && !aboutRef.current.contains(e.target as Node)) {
        setAboutOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    let rafId = 0;
    // Batch scroll-driven state updates to at most once per animation frame.
    // Reading scrollY inside rAF avoids layout thrash from style writes
    // triggered by React re-renders on every scroll event.
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
    setMobileOpen(false);
    setAboutOpen(false);
  }, [location.pathname, location.hash]);

  const dashboardPath =
    user?.role === 'SUPER_ADMIN' ? '/admin/super' :
    user?.role === 'GYM_ADMIN' ? '/admin/gym' :
    '/dashboard';

  const handleLogout = useCallback(() => {
    // Drop all cached queries so the next session can't see stale data.
    queryClient.clear();
    logout();
    navigate('/login');
  }, [logout, navigate, queryClient]);

  const isActive = useCallback(
    (path: string) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    [location.pathname],
  );

  const navClass = `fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
    hidden ? '-translate-y-full' : 'translate-y-0'
  }`;

  const barClass = scrolled
    ? 'bg-white/70 dark:bg-[var(--color-base)]/70 backdrop-blur-2xl border border-[var(--color-border)] shadow-[0_8px_32px_rgba(0,0,0,0.08)] mt-4 mx-4 lg:mx-auto max-w-7xl rounded-2xl'
    : 'bg-transparent border border-transparent mt-4 mx-4 lg:mx-auto max-w-7xl';

  return (
    <nav className={navClass}>
      <div className={`transition-all duration-500 ${barClass}`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-[72px]">

            {/* Brand */}
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/logo.webp" alt="Vajra Fitness" width="40" height="40" className="h-9 w-auto group-hover:scale-105 transition-transform duration-300" />
              <span className="text-xl font-extrabold tracking-tight text-[var(--color-deepgray)] dark:text-white">
                Vajra<span className="text-[var(--color-primary)]">Fitness</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive('/') ? 'text-[var(--color-primary)]' : 'text-[var(--color-charcoal)] hover:text-[var(--color-primary)]'
                }`}
              >
                Home
              </Link>

              <Link
                to="/gyms"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive('/gyms') ? 'text-[var(--color-primary)]' : 'text-[var(--color-charcoal)] hover:text-[var(--color-primary)]'
                }`}
              >
                Gyms
              </Link>

              <Link
                to="/membership"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive('/membership') ? 'text-[var(--color-primary)]' : 'text-[var(--color-charcoal)] hover:text-[var(--color-primary)]'
                }`}
              >
                Membership
              </Link>

              {/* About Dropdown: clicking "About" goes to the page; the chevron (or hover) opens the section menu */}
              <div
                className="relative"
                ref={aboutRef}
                onMouseEnter={() => setAboutOpen(true)}
                onMouseLeave={() => setAboutOpen(false)}
              >
                <div className="flex items-center">
                  <Link
                    to="/about"
                    className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isActive('/about') ? 'text-[var(--color-primary)]' : 'text-[var(--color-charcoal)] hover:text-[var(--color-primary)]'
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={aboutOpen}
                  >
                    About
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAboutOpen((o) => !o);
                    }}
                    aria-label="Toggle About menu"
                    aria-expanded={aboutOpen}
                    className={`p-2 -ml-2 rounded-lg transition-colors ${
                      isActive('/about') ? 'text-[var(--color-primary)]' : 'text-[var(--color-charcoal)] hover:text-[var(--color-primary)]'
                    }`}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${aboutOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div
                  role="menu"
                  className={`absolute top-full left-0 mt-2 w-56 glass-strong rounded-xl overflow-hidden transition-all duration-200 ${
                    aboutOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="py-2 flex flex-col">
                    <Link
                      to="/about"
                      className="px-4 py-2.5 text-sm font-semibold text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)] hover:pl-5 transition-all duration-200"
                    >
                      Overview
                    </Link>
                    {ABOUT_LINKS.map(({ label, slug }) => (
                      <Link
                        key={slug}
                        to={`/about#${slug}`}
                        role="menuitem"
                        className={`px-4 py-2.5 text-sm text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)] hover:pl-5 transition-all duration-200 ${
                          location.hash === `#${slug}` ? 'text-[var(--color-primary)] font-semibold' : ''
                        }`}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <Link
                to="/contact"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive('/contact') ? 'text-[var(--color-primary)]' : 'text-[var(--color-charcoal)] hover:text-[var(--color-primary)]'
                }`}
              >
                Contact
              </Link>

              <Link
                to="/help"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive('/help') ? 'text-[var(--color-primary)]' : 'text-[var(--color-charcoal)] hover:text-[var(--color-primary)]'
                }`}
              >
                Help
              </Link>
            </div>

            {/* Right side actions */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeSelector />
              {user && <NotificationsBell />}

              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to={dashboardPath}
                    className="btn-ghost gap-2 px-4! py-2! text-sm"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-medium text-[var(--color-charcoal)] hover:text-red-600 dark:hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/register/member"
                    className="text-sm font-semibold text-[var(--color-charcoal)] hover:text-[var(--color-primary)] transition-colors px-3 py-2"
                  >
                    Join a Gym
                  </Link>
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-[var(--color-charcoal)] hover:text-[var(--color-primary)] transition-colors px-3 py-2"
                  >
                    Login
                  </Link>
                  <Link to="/register" className="btn-primary px-5! py-2.5! text-sm">
                    Register Gym
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden absolute top-20 left-4 right-4 rounded-2xl transition-all duration-300 overflow-hidden bg-white/90 dark:bg-[var(--color-base)]/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-2xl ${
          mobileOpen ? 'max-h-[70vh] overflow-y-auto opacity-100 visible' : 'max-h-0 opacity-0 invisible border-transparent'
        }`}
      >
        <div className="px-4 py-3 space-y-1">
          <Link
            to="/"
            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
          >
            Home
          </Link>

          <Link
            to="/gyms"
            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
          >
            Gyms
          </Link>

          <Link
            to="/membership"
            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
          >
            Membership
          </Link>

          <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted)]">About</p>
          <Link
            to="/about"
            className={`block pl-6 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/about') && !location.hash
                ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
            }`}
          >
            Overview
          </Link>
          {ABOUT_LINKS.map(({ label, slug }) => (
            <Link
              key={slug}
              to={`/about#${slug}`}
              className={`block pl-6 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.hash === `#${slug}`
                  ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
              }`}
            >
              {label}
            </Link>
          ))}

          <Link
            to="/contact"
            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
          >
            Contact
          </Link>

          <Link
            to="/help"
            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
          >
            Help
          </Link>

          <div className="border-t border-[var(--color-border)] pt-3 mt-2 flex flex-col gap-2">
            {user ? (
              <>
                <Link to={dashboardPath} className="btn-primary text-center text-sm">Dashboard</Link>
                <button onClick={handleLogout} className="text-sm text-red-600 dark:text-red-400 py-2">Logout</button>
              </>
            ) : (
              <>
                <Link to="/register/member" className="text-sm text-center text-[var(--color-charcoal)] py-2">Join a Gym</Link>
                <Link to="/login" className="text-sm text-center text-[var(--color-charcoal)] py-2">Login</Link>
                <Link to="/register" className="btn-primary text-center text-sm">Register Gym</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
