import React from 'react';
import { Link } from 'react-router';
import { MapPin, ArrowRight } from 'lucide-react';
import { GymDirectory } from '../components/GymDirectory';
import { Reveal } from '../components/Reveal';
import { usePageMeta } from '../hooks/usePageMeta';

const GymsPage = () => {
  usePageMeta(
    'Find a Gym Near You',
    'Browse verified partner gyms across India, compare membership plans, facilities and locations, and join your nearest training home.',
    '/gyms',
  );
  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[var(--color-base)] overflow-x-hidden">
      <section className="relative pt-36 pb-16 md:pt-44 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop"
            alt="Gym interior"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-base)]/75 via-[var(--color-base)]/55 to-[var(--color-base)] dark:from-[#0d0d0d]/85 dark:via-[#0d0d0d]/70 dark:to-[#0d0d0d]" />
          <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] bg-[var(--color-accent)]/10 rounded-full blur-3xl animate-blob" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <span className="eyebrow bg-[var(--color-primary)]/10! text-[var(--color-primary)]! border-[var(--color-primary)]/20!">
              <MapPin className="w-4 h-4" />
              Gym Directory
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="display mt-8 text-5xl sm:text-6xl md:text-7xl leading-[0.95]">
              Find Your <span className="text-gradient animate-gradient-x">Training Home</span>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-6 text-lg md:text-xl text-[var(--color-muted)] max-w-2xl mx-auto leading-relaxed">
              Search and compare all partner gyms across India. Filter by city, check facilities,
              and compare membership prices.
            </p>
          </Reveal>
          <Reveal delay={320} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/membership" className="btn-outline px-8! py-3.5!">
              How Membership Works <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="section-pad !pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <GymDirectory />
        </div>
      </section>
    </div>
  );
};

export default GymsPage;
