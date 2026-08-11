import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Link } from 'react-router';
import {
  Target, Eye, Users, Briefcase, ChevronDown, ArrowRight, Mail, Sparkles, ShieldCheck, Rocket, HeartHandshake, TrendingUp,
} from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { usePageMeta } from '../hooks/usePageMeta';
import { getPublicStats } from '../api/content.api';

const VALUES = [
  { title: 'Member First', text: 'Every decision starts with what makes gym owners and members more successful.', icon: HeartHandshake },
  { title: 'Ship & Iterate', text: 'We release improvements regularly based on what gym owners actually ask for.', icon: Rocket },
  { title: 'Trust & Security', text: 'Passwords hashed with argon2, data encrypted in transit, no data sold to third parties.', icon: ShieldCheck },
  { title: 'Data Driven', text: 'Attendance, revenue, and retention reports built into every gym\'s dashboard.', icon: TrendingUp },
];

const FAQS = [
  {
    q: 'What are your operating hours?',
    a: 'Most of our branches are open from 5:00 AM to 11:00 PM, seven days a week. Premium All-Access members can check exact timings for each branch from their dashboard.',
  },
  {
    q: 'Do you offer personal training?',
    a: 'Yes! We have certified personal trainers available. You can purchase PT sessions or view your assigned Workout Slips in your Member Dashboard.',
  },
  {
    q: 'Can I transfer my membership to another branch?',
    a: 'Standard memberships are branch-specific. However, premium "All-Access" passes allow you to visit any Vajra Fitness location across India.',
  },
  {
    q: 'Is there a joining fee?',
    a: 'No hidden joining fees. You only pay for the membership plan you select. GST is applied transparently on every invoice.',
  },
  {
    q: 'How do gym owners start using the platform?',
    a: 'Register your gym in under 2 minutes, get approved by our team, import members, and start automating fees, attendance, and workout slips immediately.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted in transit (TLS 1.3), stored in Indian data centers, and never sold to third parties. See our Privacy Policy for full details.',
  },
];

const SectionHeading = ({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) => (
  <Reveal className="max-w-2xl mx-auto text-center mb-14">
    <span className="eyebrow">{eyebrow}</span>
    <h2 className="section-title mt-4">{title}</h2>
    {lead && <p className="section-lead">{lead}</p>}
  </Reveal>
);

const FaqItem = ({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) => (
  <div className="card-hover overflow-hidden p-0!">
    <button
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
    >
      <span className="font-bold text-[var(--color-deepgray)] dark:text-white text-base md:text-lg">{q}</span>
      <ChevronDown
        className={`w-5 h-5 shrink-0 text-[var(--color-primary)] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
      />
    </button>
    <div
      className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
    >
      <div className="overflow-hidden">
        <p className="px-6 pb-5 text-[var(--color-muted)] leading-relaxed">{a}</p>
      </div>
    </div>
  </div>
);

const AboutPage = () => {
  usePageMeta(
    'About Vajra Fitness',
    'Learn about Vajra Fitness — the enterprise gym management platform built for Indian fitness businesses. Our story, mission, and vision.',
    '/about',
  );
  const { hash } = useLocation();
  const [openFaq, setOpenFaq] = useState(0);
  const [gymCount, setGymCount] = useState<number | null>(null);

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash]);

  useEffect(() => {
    let active = true;
    getPublicStats()
      .then((data) => { if (active) setGymCount(data.gyms); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const gymCountLabel = gymCount && gymCount > 0 ? `${gymCount}+` : 'a growing number of';

  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[var(--color-base)] overflow-x-hidden">
      {/* ===== Hero ===== */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-24 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[var(--color-primary)]/15 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-40 -right-32 w-[28rem] h-[28rem] bg-[var(--color-accent)]/10 rounded-full blur-3xl animate-blob [animation-delay:-6s]" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-[var(--color-secondary)]/10 rounded-full blur-3xl animate-blob [animation-delay:-12s]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <span className="eyebrow">Who we are</span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="display mt-6 text-5xl sm:text-6xl md:text-7xl leading-[0.95]">
              About <span className="text-gradient">Vajra Fitness</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="section-lead mt-6 text-lg md:text-xl text-[var(--color-muted)]!">
              A SaaS platform built for gym owners and fitness professionals in India.
              We power {gymCountLabel} gyms with automated payments, attendance tracking, and digital
              workout plans — so you can focus on your members, not spreadsheets.
            </p>
          </Reveal>
          <Reveal delay={300} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary">
              Partner With Us <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/contact" className="btn-ghost">Talk to Our Team</Link>
          </Reveal>
        </div>
      </section>

      {/* ===== Company ===== */}
      <section id="company" className="section-pad scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <Reveal variant="left">
              <span className="eyebrow">Our Story</span>
              <h2 className="section-title mt-4">Built by gym operators, for gym operators</h2>
              <p className="section-lead text-left!">
                Vajra Fitness started in Jodhpur, Rajasthan with a simple frustration: gym owners were
                running multi-crore businesses on WhatsApp groups, paper registers, and Excel sheets.
              </p>
              <p className="mt-4 text-[var(--color-muted)] leading-relaxed">
                We built one unified ecosystem to manage memberships, automate payments, streamline
                workout tracking, and give owners a bird's-eye view of every branch — so they can
                focus on what matters most: their members' health.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  'Passwords hashed with argon2, data encrypted in transit (TLS 1.3)',
                  'Purpose-built for the Indian fitness market',
                  'Multi-branch management with role-based access',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[var(--color-charcoal)] font-medium">
                    <Sparkles className="w-5 h-5 shrink-0 text-[var(--color-primary)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal variant="right" className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-accent)] blur-3xl opacity-20 rounded-full" />
              <img
                src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=2070&auto=format&fit=crop"
                alt="Modern gym floor"
                loading="lazy"
                className="relative z-10 rounded-3xl shadow-2xl border border-[var(--color-border)] aspect-[4/3] object-cover"
              />
              <div className="glass-strong absolute -bottom-6 -left-6 rounded-2xl px-6 py-4 hidden sm:block">
                <p className="text-3xl font-extrabold text-[var(--color-primary)]">{gymCount !== null ? gymCount : '—'}</p>
                <p className="text-sm font-semibold text-[var(--color-muted)]">Partner gyms and growing</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Mission & Vision ===== */}
      <section id="mission-vision" className="section-pad scroll-mt-24 bg-[var(--color-base-dark)]/50 dark:bg-white/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Purpose" title="Mission & Vision" />
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Reveal delay={0}>
              <div className="card-hover h-full border-t-4 border-t-[var(--color-primary)]">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-6">
                  <Target className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-extrabold mb-3">Our Mission</h3>
                <p className="text-[var(--color-muted)] leading-relaxed">
                  To give gyms of any size — from a single studio to a multi-branch chain — the same
                  membership, payment, and attendance tools without the enterprise price tag.
                </p>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="card-hover h-full border-t-4 border-t-[var(--color-secondary)]">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] flex items-center justify-center mb-6">
                  <Eye className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-extrabold mb-3">Our Vision</h3>
                <p className="text-[var(--color-muted)] leading-relaxed">
                  A single dashboard where gym owners can see every branch's members, revenue, and
                  attendance at a glance, instead of piecing it together from registers and Excel.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 100}>
                <div className="card-hover h-full">
                  <v.icon className="w-8 h-8 text-[var(--color-primary)] mb-4" />
                  <h4 className="font-bold text-lg mb-2">{v.title}</h4>
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Careers ===== */}
      <section id="careers" className="section-pad scroll-mt-24 bg-[var(--color-base-dark)]/50 dark:bg-white/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <Reveal>
              <span className="eyebrow">Careers</span>
              <h2 className="section-title mt-4">Do the best work of your life</h2>
              <p className="section-lead text-left!">
                We're always looking for passionate engineers, designers, and sales professionals to
                join our mission of modernizing Indian fitness businesses.
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {[
                  { icon: Briefcase, label: 'Remote-first', text: 'Work from anywhere in India' },
                  { icon: Users, label: 'Great team', text: 'Learn from the best operators' },
                  { icon: Rocket, label: 'Real ownership', text: 'Ship features gym owners actually use' },
                  { icon: HeartHandshake, label: 'Wellbeing', text: 'Free gym + health benefits' },
                ].map((p) => (
                  <div key={p.label} className="card-hover p-5!">
                    <p.icon className="w-6 h-6 text-[var(--color-primary)] mb-3" />
                    <h4 className="font-bold text-sm">{p.label}</h4>
                    <p className="text-xs text-[var(--color-muted)] mt-1">{p.text}</p>
                  </div>
                ))}
              </div>
              <a href="mailto:careers@vajrafitness.in" className="btn-primary mt-8">
                View Open Positions <Mail className="w-5 h-5" />
              </a>
            </Reveal>

            <Reveal variant="right">
              <img
                src="https://images.unsplash.com/photo-1558611848-73f7eb4001a1?q=80&w=2070&auto=format&fit=crop"
                alt="Team working together"
                loading="lazy"
                className="rounded-3xl shadow-2xl border border-[var(--color-border)] aspect-[4/3] object-cover"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="section-pad scroll-mt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ" title="Frequently Asked Questions" lead="Everything you need to know about memberships, training, and the platform." />
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <Reveal key={faq.q} delay={i * 60}>
                <FaqItem
                  q={faq.q}
                  a={faq.a}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
                />
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mt-10">
            <p className="text-[var(--color-muted)]">Still have questions?</p>
            <Link to="/contact" className="inline-flex items-center gap-2 font-bold text-[var(--color-primary)] hover:underline mt-1">
              Contact our team <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-section-dark)] to-[var(--color-section-dark-alt)]" />
        <div className="absolute -top-20 right-0 w-[600px] h-[600px] bg-[var(--color-primary)] rounded-full blur-3xl opacity-20 animate-blob" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <Reveal>
            <h2 className="display text-4xl md:text-6xl text-white leading-none mb-6">
              Ready to modernize your gym?
            </h2>
            <p className="text-lg text-gray-300 mb-10 max-w-xl mx-auto">
              Join {gymCountLabel} gyms across India running their business on Vajra Fitness.
              Start your 14-day free trial today — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register" className="btn-accent px-10! py-4! text-lg">
                Create Free Account
              </Link>
              <Link to="/contact" className="btn-outline px-10! py-4! text-lg border-white/20! text-white! hover:bg-white! hover:text-black!">
                Talk to Sales
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
