import { Link } from 'react-router';
import { ArrowRight, Camera, ClipboardList, FileText, IdCard, MapPin, Tags } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuthStore } from '../store/useAuthStore';
import { ROUTES } from '../utils/routes';

const NEEDS = [
  { icon: ClipboardList, title: 'Gym details', text: 'Name, phone number, type of gym and a few lines about it.' },
  { icon: MapPin, title: 'Full address', text: 'Street address, city, state and pincode. Map location if you are at the gym.' },
  { icon: Camera, title: 'Photos', text: 'At least one clear photo. Floor, equipment and changing rooms work best.' },
  { icon: Tags, title: 'Membership plans', text: 'Your plans with days and price, the way members pay today.' },
  { icon: IdCard, title: 'Owner ID proof', text: 'Aadhaar, PAN, passport or voter ID of the owner.' },
  { icon: FileText, title: 'Business proof', text: 'Shop licence, trade licence, rent agreement or Udyam certificate. GST certificate if you have one.' },
];

const STEPS = [
  { title: 'Create your owner account', text: 'Your name, email, gym name and city.' },
  { title: 'Fill the application', text: 'Seven short steps. Everything saves as you go, so you can finish later.' },
  { title: 'Send it for review', text: 'Our team checks your details and documents. If something is missing, we tell you what to fix.' },
  { title: 'Go live', text: 'Once approved, your gym shows up on Find gyms and you run it from your console.' },
];

export default function ListYourGymPage() {
  usePageMeta('List your gym', 'Put your gym on Kavach Fitness. See what you need and how the review works.', ROUTES.listYourGym);
  const user = useAuthStore((s) => s.user);
  const start = user?.role === 'GYM_ADMIN' ? ROUTES.partnerApply : ROUTES.partnerRegister;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--color-base)]">
      <section className="relative isolate flex min-h-[30rem] items-center overflow-hidden py-16 md:py-20">
        <img
          src="/images/auth-owner-pexels.jpg"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/65 to-black/25" aria-hidden="true" />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Reveal>
              <span className="inline-flex items-center rounded-full border border-white/25 bg-black/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">For gym owners</span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-6 text-5xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl">List your gym</h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-6 text-lg leading-relaxed text-white/80">
                Fill one application with your gym details, photos, plans and documents. Our team reviews it, and once approved
                members can find your gym on Kavach Fitness.
              </p>
            </Reveal>
            <Reveal delay={300} className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <Link to={start} className="btn-primary min-h-11">
                Start your application <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              {!user && (
                <Link
                  to={`${ROUTES.partnerLogin}?redirect=${encodeURIComponent(ROUTES.partnerApplication)}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/35 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Already applied? Log in
                </Link>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 md:py-20">
        <Reveal className="max-w-2xl">
          <span className="eyebrow">Before you start</span>
          <h2 className="section-title mt-4">What you need</h2>
          <p className="section-lead">Keep these ready. Photos and documents can be clicked on your phone.</p>
        </Reveal>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NEEDS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <Icon className="h-6 w-6 text-[var(--color-primary)]" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-[var(--color-deepgray)]">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[var(--color-muted)]">Documents are only seen by our review team. They never appear on your gym page.</p>
      </section>

      <section className="border-t border-[var(--color-border)] bg-[var(--color-base-dark)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 md:py-20">
          <Reveal className="max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="section-title mt-4">From application to listing</h2>
          </Reveal>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {STEPS.map(({ title, text }, i) => (
              <li key={title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] font-bold text-white dark:text-[var(--color-base)]">{i + 1}</span>
                <h3 className="mt-4 font-bold text-[var(--color-deepgray)]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[var(--color-section-dark)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Ready to list your gym?</h2>
            <p className="mt-2 text-white/70">Questions first? <Link to="/contact" className="font-semibold text-white underline underline-offset-2">Talk to our team</Link>.</p>
          </div>
          <Link to={start} className="btn-primary min-h-11 shrink-0">
            Start your application <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
