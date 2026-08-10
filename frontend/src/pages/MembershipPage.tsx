import React from 'react';
import { Link } from 'react-router';
import { MapPin, CreditCard, ShieldCheck, CalendarCheck, ArrowRight, Dumbbell, CheckCircle2 } from 'lucide-react';
import { GymDirectory } from '../components/GymDirectory';
import { Reveal } from '../components/Reveal';
import { usePageMeta } from '../hooks/usePageMeta';

const STEPS = [
  {
    title: 'Browse Gyms',
    desc: 'Explore verified fitness centers near you. Compare facilities, locations and membership plans at a glance.',
    icon: MapPin,
  },
  {
    title: 'Pick Your Plan',
    desc: 'Choose a gym and the membership plan that fits your goals — monthly, quarterly or annual.',
    icon: CreditCard,
  },
  {
    title: 'Get Approved & Train',
    desc: 'Submit your request, get approved by the gym, and start training. Track everything from your dashboard.',
    icon: CalendarCheck,
  },
];

const PERKS = [
  'Verified & approved partner gyms',
  'Transparent pricing, no hidden fees',
  'Membership details saved in your dashboard',
  'Secure registration with your own account',
];

const MembershipPage = () => {
  usePageMeta(
    'Gym Memberships & Plans',
    'Explore verified gyms and flexible membership plans — monthly, quarterly or annual. Register, get approved, and start training with Vajra Fitness.',
    '/membership',
  );
  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[#0d0d0d] overflow-x-hidden">
      {/* HERO */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop"
            alt="Gym interior"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-base)]/75 via-[var(--color-base)]/55 to-[var(--color-base)] dark:from-[#0d0d0d]/85 dark:via-[#0d0d0d]/70 dark:to-[#0d0d0d]" />
          <div className="absolute -top-32 -right-32 w-[34rem] h-[34rem] bg-[var(--color-primary)]/15 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/2 -left-40 w-[30rem] h-[30rem] bg-[var(--color-accent)]/10 rounded-full blur-3xl animate-blob [animation-delay:-8s]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <span className="eyebrow bg-[var(--color-primary)]/10! text-[var(--color-primary)]! border-[var(--color-primary)]/20!">
              <Dumbbell className="w-4 h-4" />
              Find Your Perfect Gym
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="display mt-8 text-5xl sm:text-6xl md:text-8xl leading-[0.95]">
              Get Fit, <span className="text-gradient animate-gradient-x">Anywhere</span>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-7 text-lg md:text-2xl text-[var(--color-muted)] max-w-3xl mx-auto leading-relaxed">
              Browse the best gyms in your city, compare membership plans, and join in minutes.
              Your membership lives in your dashboard — always.
            </p>
          </Reveal>
          <Reveal delay={320} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#gyms" className="btn-primary px-8! py-4! text-lg w-full sm:w-auto">
              Browse Gyms <ArrowRight className="w-5 h-5" />
            </a>
            <Link to="/register/member" className="btn-ghost px-8! py-4! text-lg w-full sm:w-auto">
              <ShieldCheck className="w-5 h-5" /> Create Member Account
            </Link>
          </Reveal>
        </div>
      </section>

      {/* PERKS STRIP */}
      <section className="relative z-10 -mt-8 md:-mt-10 py-6 border-y border-[var(--color-border)] bg-[var(--color-surface)]/60 dark:bg-white/[0.03] backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PERKS.map((perk, i) => (
            <Reveal key={perk} delay={i * 80}>
              <p className="flex items-center gap-2.5 text-sm font-semibold text-[var(--color-charcoal)] dark:text-white">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                {perk}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section-pad">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl mx-auto text-center mb-16">
            <span className="eyebrow">How it works</span>
            <h2 className="section-title mt-4">Join a gym in three easy steps</h2>
            <p className="section-lead">No paperwork, no phone calls. Pick a gym, choose a plan, and you're in.</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 120} className="h-full">
                <div className="card-hover h-full relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white flex items-center justify-center mb-6 shadow-lg shadow-[var(--color-primary)]/20">
                    <step.icon className="w-7 h-7" />
                  </div>
                  <span className="absolute top-6 right-6 text-5xl font-extrabold text-[var(--color-primary)]/10">{i + 1}</span>
                  <h3 className="text-xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-3">{step.title}</h3>
                  <p className="text-[var(--color-muted)] leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* GYM DIRECTORY */}
      <section id="gyms" className="section-pad scroll-mt-24 bg-[var(--color-base-dark)]/50 dark:bg-white/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl mx-auto text-center mb-12">
            <span className="eyebrow">Our Partner Gyms</span>
            <h2 className="section-title mt-4">Explore gyms near you</h2>
            <p className="section-lead">Search by gym, city, or facility and find your next training home.</p>
          </Reveal>

          <GymDirectory />
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-section-dark)] to-[var(--color-section-dark-alt)]" />
        <div className="absolute top-0 left-0 -translate-y-1/2 -translate-x-1/3 w-[700px] h-[700px] bg-[var(--color-primary)] rounded-full blur-3xl opacity-20 animate-blob" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <Reveal>
            <h2 className="display text-4xl md:text-6xl text-white leading-none mb-6">
              Ready to start your fitness journey?
            </h2>
            <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
              Create your free member account, browse gyms, and submit your membership request today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register/member" className="btn-accent px-10! py-4! text-lg">
                Create Member Account
              </Link>
              <Link to="/gyms" className="btn-outline border-white/20! text-white! hover:bg-white! hover:text-black! px-10! py-4! text-lg">
                View All Gyms
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default MembershipPage;
