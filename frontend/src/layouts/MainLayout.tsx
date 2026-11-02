import { Outlet, Link } from 'react-router';
import { ROUTES } from '../utils/routes';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from '../utils/constants';
import Navbar from '../components/Navbar';
import CookieConsent from '../components/CookieConsent';
import PageTransition from '../components/PageTransition';
import { MapPin, Phone, Mail, ArrowUpRight } from 'lucide-react';

const FOOTER_LINKS = {
  'Quick Links': [
    ['Home', '/'],
    ['Gyms', '/gyms'],
    ['Membership', '/membership'],
    ['Help Center', '/help'],
    ['Contact', '/contact'],
    ['Register Your Gym', ROUTES.partnerRegister],
  ],
  Legal: [
    ['Terms & Conditions', '/terms'],
    ['Privacy Policy', '/privacy'],
    ['Cookie Policy', '/cookies'],
    ['Refund Policy', '/refund'],
  ],
};

const MainLayout = () => {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-base)] dark:bg-[var(--color-base)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--color-primary)] focus:text-white">Skip to content</a>
      <Navbar />
      <main id="main" className="flex-grow pt-20 md:pt-[88px]">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <footer className="bg-[var(--color-section-dark)] text-white relative overflow-hidden">        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent" />
        <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-[var(--color-primary)] rounded-full blur-3xl opacity-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">

          <div>
            <Link to="/" className="flex items-center gap-3 mb-4 w-fit">
              <img src="/logo.svg" alt="Kavach Fitness" width="36" height="36" className="h-8 w-auto drop-shadow-[0_2px_6px_rgba(225,29,72,0.25)]" />
              <span className="text-xl font-extrabold tracking-tight">
                Kavach<span className="text-red-400">Fitness</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Premium gym management platform for Indian fitness businesses. Building the modern
              operating system for gyms.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-wider">{heading}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {links.map(([label, to]) => (
                  <li key={to}>
                    <Link to={to} className="group inline-flex items-center gap-1 hover:text-white transition-colors">
                      {label}
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-primary)]" />
                India
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
                <a href={`tel:${SUPPORT_PHONE}`} className="hover:text-white transition-colors">{SUPPORT_PHONE_DISPLAY}</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors">{SUPPORT_EMAIL}</a>
              </li>
            </ul>

            <Link to={ROUTES.partnerRegister} className="btn-accent mt-6 w-full">Partner With Us</Link>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400">
            <span>© {year} Kavach Fitness. All rights reserved.</span>
            <div className="flex gap-5">
              <Link to="/about" className="hover:text-white transition-colors">About</Link>
              <Link to="/help" className="hover:text-white transition-colors">Help</Link>
              <Link to={ROUTES.login} className="hover:text-white transition-colors">Login</Link>
            </div>
          </div>
        </div>
      </footer>

      <CookieConsent />
    </div>
  );
};

export default MainLayout;
