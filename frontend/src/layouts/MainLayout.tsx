import React from 'react';
import { Outlet, Link } from 'react-router';
import Navbar from '../components/Navbar';
import CookieConsent from '../components/CookieConsent';
import PageTransition from '../components/PageTransition';
import { MapPin, Phone, Mail, ArrowUpRight } from 'lucide-react';

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const FOOTER_LINKS = {
  'Quick Links': [
    ['Home', '/'],
    ['Gyms', '/gyms'],
    ['Membership', '/membership'],
    ['Help Center', '/help'],
    ['Contact', '/contact'],
    ['Register Your Gym', '/register'],
  ],
  Legal: [
    ['Terms & Conditions', '/terms'],
    ['Privacy Policy', '/privacy'],
    ['Cookie Policy', '/cookies'],
    ['Refund Policy', '/refund'],
  ],
};

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/vajrafitness', icon: InstagramIcon },
  { label: 'Facebook', href: 'https://facebook.com/vajrafitness', icon: FacebookIcon },
  { label: 'YouTube', href: 'https://youtube.com/@vajrafitness', icon: YoutubeIcon },
];

const MainLayout = () => {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-base)] dark:bg-[var(--color-base)]">
      <Navbar />
      <main className="flex-grow pt-20 md:pt-[88px]">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <footer className="bg-[var(--color-section-dark)] text-white relative overflow-hidden">        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent" />
        <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-[var(--color-primary)] rounded-full blur-3xl opacity-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">

          <div>
            <Link to="/" className="flex items-center gap-3 mb-4 w-fit">
              <img src="/logo.webp" alt="Vajra Fitness" width="36" height="36" className="h-8 w-auto" />
              <span className="text-xl font-extrabold tracking-tight">
                Vajra<span className="text-[var(--color-primary)]">Fitness</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Premium gym management platform for Indian fitness businesses. Based in Jodhpur,
              Rajasthan.
            </p>
            <div className="flex gap-3 mt-6">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-[var(--color-primary)] text-gray-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:-translate-y-1"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
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
                Jodhpur, Rajasthan
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
                <a href="tel:+917894561230" className="hover:text-white transition-colors">+91 78945 61230</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
                <a href="mailto:support@vajrafitness.in" className="hover:text-white transition-colors">support@vajrafitness.in</a>
              </li>
            </ul>

            <Link to="/register" className="btn-accent mt-6 w-full">Partner With Us</Link>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400">
            <span>© {year} Vajra Fitness. All rights reserved.</span>
            <div className="flex gap-5">
              <Link to="/about" className="hover:text-white transition-colors">About</Link>
              <Link to="/help" className="hover:text-white transition-colors">Help</Link>
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            </div>
          </div>
        </div>
      </footer>

      <CookieConsent />
    </div>
  );
};

export default MainLayout;
