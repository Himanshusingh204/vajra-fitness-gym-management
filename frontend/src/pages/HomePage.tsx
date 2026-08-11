import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight, Users, Dumbbell, TrendingUp, Activity,
  CreditCard, BarChart3, CalendarCheck, PlayCircle, Star,
  Check, Zap, Globe2, Headset,
} from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { Counter } from '../components/Counter';
import { usePageMeta } from '../hooks/usePageMeta';
import api from '../services/api';
import { getPublicStats, type PublicStats } from '../api/content.api';
import { getSaaSPlans, type SaaSPlan } from '../api/saas.api';

const STAT_ICONS: Record<keyof PublicStats, typeof Users> = {
  members: Users,
  gyms: Globe2,
  trainers: Dumbbell,
  cities: CalendarCheck,
};

const STAT_LABELS: Record<keyof PublicStats, string> = {
  members: 'Active Members',
  gyms: 'Partner Gyms',
  trainers: 'Pro Trainers',
  cities: 'Cities Covered',
};

const STAT_ORDER: (keyof PublicStats)[] = ['members', 'gyms', 'trainers', 'cities'];

const FEATURES = [
  {
    title: 'Advanced Member Management',
    description: 'Track attendance, active plans, and renewals automatically with zero paperwork.',
    icon: Users,
  },
  {
    title: 'Workout & Diet Slips',
    description: 'Assign personalized routines directly to your members\' app in a few clicks.',
    icon: Dumbbell,
  },
  {
    title: 'Smart Payment Tracking',
    description: 'Automated invoices, GST handling, and overdue reminders that collect dues for you.',
    icon: CreditCard,
  },
  {
    title: 'Lead CRM',
    description: 'Capture website enquiries and convert walk-in leads into paying members.',
    icon: Activity,
  },
  {
    title: 'Attendance & Check-ins',
    description: 'Daily check-ins for members and staff with instant, at-a-glance reports.',
    icon: CalendarCheck,
  },
  {
    title: 'Analytics & Reports',
    description: 'Revenue, retention, and branch performance dashboards that scale with you.',
    icon: BarChart3,
  },
];

const STEPS = [
  {
    title: 'Register your Gym',
    desc: 'Create your account and list your branches in under 2 minutes. No technical setup needed.',
  },
  {
    title: 'Import Members',
    desc: 'Easily add members or have them register through your custom gym link in seconds.',
  },
  {
    title: 'Automate & Relax',
    desc: 'The system handles fee reminders, attendance, and analytics automatically — you grow.',
  },
];

type HomeTestimonial = {
  name: string;
  role: string;
  initials: string;
  content: string;
  rating: number;
  imageUrl?: string | null;
};

const HomePage = () => {
  usePageMeta(undefined, undefined, '/');
  const [testimonials, setTestimonials] = useState<HomeTestimonial[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/public/testimonials')
      .then((res) => {
        if (!active || !Array.isArray(res.data) || res.data.length === 0) return;
        setTestimonials(res.data.map((t: any) => ({
          name: t.name,
          role: t.role,
          initials: t.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
          content: t.content,
          rating: Math.min(5, Math.max(1, Number(t.rating) || 5)),
          imageUrl: t.imageUrl || null,
        })));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getPublicStats()
      .then((data) => { if (active) setStats(data); })
      .catch(() => {})
      .finally(() => { if (active) setStatsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getSaaSPlans()
      .then((data) => { if (active) setPlans(data); })
      .catch(() => {})
      .finally(() => { if (active) setPlansLoading(false); });
    return () => { active = false; };
  }, []);

  const highlightPlanId = plans.find((p) => p.code === 'PROFESSIONAL')?.id
    ?? plans[Math.floor(plans.length / 2)]?.id;

  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[var(--color-base)] overflow-x-hidden">
      {/* ============================================================
          1. HERO
          ============================================================ */}
      <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop"
            alt="Gym interior"
            fetchPriority="high"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-base)]/75 via-[var(--color-base)]/55 to-[var(--color-base)] dark:from-[#0d0d0d]/85 dark:via-[#0d0d0d]/70 dark:to-[#0d0d0d]" />
          <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] bg-[var(--color-primary)]/15 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-[var(--color-accent)]/10 rounded-full blur-3xl animate-blob [animation-delay:-8s]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <span className="eyebrow bg-[var(--color-primary)]/10! text-[var(--color-primary)]! border-[var(--color-primary)]/20!">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary)]" />
              </span>
              Now onboarding gyms across India
            </span>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="display mt-8 text-5xl sm:text-6xl md:text-8xl leading-[0.95]">
              Run Your Gym.<br />
              <span className="text-gradient animate-gradient-x">Skip the Spreadsheets.</span>
            </h1>
          </Reveal>

          <Reveal delay={220}>
            <p className="mt-7 text-lg md:text-2xl text-[var(--color-muted)] max-w-3xl mx-auto leading-relaxed">
              Manage members, automate fee reminders, assign workout slips, and track attendance
              from one dashboard — built for gyms in India.
            </p>
          </Reveal>

          <Reveal delay={320} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary px-8! py-4! text-lg w-full sm:w-auto">
              Get Started for Free <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#features" className="btn-ghost px-8! py-4! text-lg w-full sm:w-auto">
              <PlayCircle className="w-5 h-5" /> See How it Works
            </a>
          </Reveal>

          <Reveal delay={420}>
            <p className="mt-8 text-sm text-[var(--color-muted)] flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-[var(--color-accent)]" />
              14-day free trial · No credit card required · Cancel anytime
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          2. MARQUEE STRIP
          ============================================================ */}
      <section className="relative z-10 -mt-8 md:-mt-10 py-5 border-y border-[var(--color-border)] bg-[var(--color-surface)]/60 dark:bg-white/[0.03] backdrop-blur overflow-hidden">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap px-6">
          {[0, 1].map((dup) => (
            <React.Fragment key={dup}>
              {['Payments Automated', 'Attendance Tracked', 'Workout Slips', 'Multi-Branch', 'GST Ready', 'Lead CRM', 'Live Analytics', 'Member App'].map((item) => (
                <span key={`${dup}-${item}`} className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                  <Zap className="w-4 h-4 text-[var(--color-primary)]" /> {item}
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ============================================================
          3. STATS
          ============================================================ */}
      <section className="section-pad !pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STAT_ORDER.map((key, i) => {
              const Icon = STAT_ICONS[key];
              const value = stats ? stats[key] : 0;
              return (
                <Reveal key={key} delay={i * 100}>
                  <div className="card-hover h-full flex flex-col items-center text-center p-8!">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7" />
                    </div>
                    <p className="text-4xl md:text-5xl font-extrabold text-[var(--color-deepgray)] dark:text-white tracking-tight">
                      {statsLoading ? (
                        <span className="inline-block h-10 w-16 rounded-lg bg-[var(--color-primary)]/10 animate-pulse" />
                      ) : (
                        <Counter end={value} suffix={value > 0 ? '+' : ''} />
                      )}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">{STAT_LABELS[key]}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          4. FEATURES
          ============================================================ */}
      <section id="features" className="section-pad scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl mx-auto text-center mb-16">
            <span className="eyebrow">Platform</span>
            <h2 className="section-title mt-4">Everything you need to scale</h2>
            <p className="section-lead">
              Stop using WhatsApp and Excel. Vajra Fitness provides a unified dashboard to control
              every aspect of your gym facility.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={(i % 3) * 100}>
                <div className="card-hover group h-full">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white flex items-center justify-center mb-6 shadow-lg shadow-[var(--color-primary)]/20 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-3 group-hover:text-[var(--color-primary)] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--color-muted)] leading-relaxed">{feature.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          5. WORKFLOW / HOW IT WORKS
          ============================================================ */}
      <section className="section-pad bg-[var(--color-base-dark)]/50 dark:bg-white/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <Reveal variant="left" className="flex-1 w-full">
              <span className="eyebrow">How it works</span>
              <h2 className="section-title mt-4">How Gyms Get Started</h2>

              <div className="mt-10 space-y-0">
                {STEPS.map((step, i) => (
                  <Reveal key={step.title} delay={i * 120}>
                    <div className="relative flex gap-5 pb-10 last:pb-0">
                      {i < STEPS.length - 1 && (
                        <span className="absolute left-6 top-14 bottom-0 w-px bg-gradient-to-b from-[var(--color-primary)]/40 to-transparent" />
                      )}
                      <div className="relative flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white flex items-center justify-center font-extrabold text-lg shadow-lg shadow-[var(--color-primary)]/25">
                        {i + 1}
                        <span className="absolute inset-0 rounded-full bg-[var(--color-primary)] opacity-20 animate-ping [animation-duration:2.5s]" />
                      </div>
                      <div className="pt-1">
                        <h4 className="text-xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-1.5">{step.title}</h4>
                        <p className="text-[var(--color-muted)] leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal variant="right" className="flex-1 relative w-full">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-accent)] blur-3xl opacity-20 rounded-full" />
              <img
                src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070&auto=format&fit=crop"
                alt="Personal trainer assisting a member"
                loading="lazy"
                className="relative z-10 rounded-3xl shadow-2xl border border-[var(--color-border)] aspect-[4/3] object-cover"
              />
              <div className="glass-strong absolute -bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-72 rounded-2xl p-5 flex items-center gap-4 animate-float">
                <div className="w-11 h-11 rounded-xl bg-green-500/15 text-green-500 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-extrabold text-lg text-[var(--color-deepgray)] dark:text-white leading-tight">Automated fee reminders</p>
                  <p className="text-xs font-semibold text-[var(--color-muted)]">Fewer overdue payments to chase</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================
          6. PRICING
          ============================================================ */}
      <section className="section-pad">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl mx-auto text-center mb-16">
            <span className="eyebrow">Pricing</span>
            <h2 className="section-title mt-4">Simple pricing that scales with you</h2>
            <p className="section-lead">Start free for 14 days. No hidden fees, no credit card required.</p>
          </Reveal>

          {plansLoading ? (
            <div className="grid md:grid-cols-3 gap-8 items-stretch">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card-hover p-8 h-64 animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <p className="text-center text-[var(--color-muted)]">
              Pricing plans are being updated. <Link to="/contact" className="font-bold text-[var(--color-primary)] hover:underline">Contact us</Link> for current pricing.
            </p>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 items-stretch">
              {plans.map((plan, i) => {
                const highlight = plan.id === highlightPlanId;
                return (
                  <Reveal key={plan.id} delay={i * 120} className="h-full">
                    <div className={`relative h-full rounded-2xl transition-all duration-300 hover:-translate-y-2 ${
                      highlight
                        ? 'bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-2xl shadow-[var(--color-primary)]/30 p-8 md:scale-[1.03] z-10'
                        : 'card-hover p-8'
                    }`}>
                      {highlight && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 chip bg-white text-[var(--color-primary)] shadow-lg">
                          <Zap className="w-3.5 h-3.5" /> Most Popular
                        </span>
                      )}
                      <h3 className={`text-2xl font-extrabold ${highlight ? 'text-white' : ''}`}>{plan.name}</h3>
                      <p className={`text-sm mt-1 ${highlight ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>{plan.description}</p>

                      <div className="flex items-end gap-1 mt-6 mb-8">
                        <span className={`text-sm font-semibold mb-1.5 ${highlight ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>₹</span>
                        <span className="text-5xl font-extrabold tracking-tight">{plan.monthlyPrice.toLocaleString('en-IN')}</span>
                        <span className={`text-sm font-semibold mb-1.5 ${highlight ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>/month</span>
                      </div>

                      <ul className="space-y-3 mb-8">
                        {plan.features.map((f) => (
                          <li key={f} className={`flex items-start gap-3 text-sm ${highlight ? 'text-white/85' : 'text-[var(--color-charcoal)]'}`}>
                            <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              highlight ? 'bg-white/20 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            }`}>
                              <Check className="w-3.5 h-3.5" />
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <Link
                        to="/subscription"
                        className={`w-full text-center ${highlight ? 'btn-accent' : 'btn-outline'}`}
                      >
                        Choose Plan
                      </Link>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}

          <Reveal className="text-center mt-12">
            <p className="text-[var(--color-muted)] flex items-center justify-center gap-2">
              <Headset className="w-4 h-4 text-[var(--color-primary)]" />
              All plans include onboarding support and a dedicated success manager.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          7. TESTIMONIALS
          ============================================================ */}
      {testimonials.length > 0 && (
      <section className="section-pad bg-[var(--color-base-dark)]/50 dark:bg-white/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl mx-auto text-center mb-16">
            <span className="eyebrow">Testimonials</span>
            <h2 className="section-title mt-4">
              {!statsLoading && stats && stats.gyms > 0 ? `Trusted by ${stats.gyms}+ Gyms` : 'What Gym Owners Say'}
            </h2>
            <p className="section-lead">See what fitness business owners are saying about Vajra Fitness.</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 120}>
                <div className="card-hover h-full flex flex-col justify-between">
                  <div>
                    <div className="flex gap-1 mb-5">
                      {[...Array(t.rating)].map((_, j) => (
                        <Star key={j} className="w-5 h-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-[var(--color-charcoal)] italic leading-relaxed mb-6">"{t.content}"</p>
                  </div>
                  <div className="flex items-center gap-4 pt-5 border-t border-[var(--color-border)]">
                    {t.imageUrl ? (
                      <img src={t.imageUrl} alt={t.name} loading="lazy" className="w-11 h-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white text-sm font-extrabold flex items-center justify-center shrink-0">
                        {t.initials}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-[var(--color-deepgray)] dark:text-white">{t.name}</h4>
                      <p className="text-sm font-medium text-[var(--color-primary)]">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ============================================================
          8. CALL TO ACTION
          ============================================================ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-section-dark)] to-[var(--color-section-dark-alt)]" />
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-[var(--color-primary)] rounded-full blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 left-0 -translate-x-1/3 translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-accent)] rounded-full blur-3xl opacity-15 animate-blob [animation-delay:-9s]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <Reveal>
            <h2 className="display text-5xl md:text-7xl text-white leading-none mb-6">
              Ready to upgrade your Gym?
            </h2>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Start your 14-day free trial today — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register" className="btn-accent px-10! py-4! text-lg">
                Create Free Account
              </Link>
              <Link to="/contact" className="btn-outline border-white/20! text-white! hover:bg-white! hover:text-black! px-10! py-4! text-lg">
                Talk to Sales
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
