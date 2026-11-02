import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { sendGymEnquiry, type PublicGym } from '../../api/gym.api';
import { DAYS, useGymSite } from './gymData';
import { Reveal } from '../../components/Reveal';
import { formatDuration, formatPrice } from '../../utils/format';
import { createPlanOrder, getPaymentConfig, loadRazorpayScript } from '../../api/payment.api';
import { useAuthStore } from '../../store/useAuthStore';

export const Section = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <Reveal as="section" className="mt-20 md:mt-28">
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-deepgray)] md:text-3xl">{title}</h2>
      {action}
    </div>
    <div className="mt-8">{children}</div>
  </Reveal>
);

export const TextLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]">
    {children}
    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
  </Link>
);

export function GymPageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  const { gym, base, images } = useGymSite();
  return (
    <section className="relative isolate mt-8 min-h-60 overflow-hidden rounded-[1.75rem] bg-[#111] sm:mt-10 sm:min-h-72 sm:rounded-[2rem]">
      <img src={images[0]?.src ?? '/gym/hero.webp'} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/45 to-transparent" />
      <div className="flex min-h-60 flex-col items-start justify-end p-6 sm:min-h-72 sm:p-9 lg:p-12">
        <Link to={base} className="mb-8 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <ArrowLeft className="h-3.5 w-3.5" /> {gym.name}
        </Link>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{eyebrow} <span aria-hidden="true">/</span> {gym.city}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">{description}</p>
      </div>
    </section>
  );
}

export const Notice = ({ children }: { children: ReactNode }) => (
  <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-5 text-sm text-[var(--color-muted)]">{children}</p>
);

// Members buy through Kavach; the webhook activates the membership, not this page.
function BuyPlanButton({ gymId, plan }: { gymId: string; plan: PublicGym['plans'][number] }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    try {
      const order = await createPlanOrder(gymId, plan.id, crypto.randomUUID());
      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error('Payment gateway unavailable');
      new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Kavach Fitness',
        description: plan.name,
        order_id: order.razorpayOrderId,
        handler: () => navigate('/dashboard'),
      }).open();
    } catch {
      // Errors are surfaced by the global API interceptor.
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={buy} disabled={busy} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2">
      {busy ? 'Opening checkout...' : 'Buy online'}
    </button>
  );
}

export function PlanGrid({ plans, limit, gymId }: { plans: PublicGym['plans']; limit?: number; gymId?: string }) {
  const shown = limit ? plans.slice(0, limit) : plans;
  const isMember = useAuthStore((s) => s.user?.role === 'MEMBER');
  const { data: payConfig } = useQuery({ queryKey: ['paymentConfig'], queryFn: getPaymentConfig, enabled: !!gymId && isMember });
  const canBuy = !!gymId && isMember && !!payConfig?.enabled;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((p, i) => (
        <Reveal as="li" key={p.id} delay={i * 80} className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_14px_38px_-34px_rgba(0,0,0,0.45)] sm:p-6">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]"><Check className="h-3 w-3" /> Membership</p>
          <div className="min-w-0">
            <p className="mt-4 text-xl font-extrabold tracking-tight text-[var(--color-deepgray)]">{p.name}</p>
            {p.description && <p className="mt-2 min-h-10 text-sm leading-relaxed text-[var(--color-muted)]">{p.description}</p>}
          </div>
          <p className="mt-auto border-t border-[var(--color-border)] pt-5">
            <span className="text-3xl font-extrabold tracking-tight text-[var(--color-deepgray)]">{formatPrice(p.price)}</span>
            <span className="mt-1 block text-sm text-[var(--color-muted)]">for {formatDuration(p.duration)}</span>
          </p>
          {canBuy && <BuyPlanButton gymId={gymId} plan={p} />}
        </Reveal>
      ))}
    </ul>
  );
}

export function TrainerList({ trainers, limit }: { trainers: PublicGym['trainers']; limit?: number }) {
  const shown = limit ? trainers.slice(0, limit) : trainers;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((t, i) => (
        <Reveal as="li" key={`${t.name}-${i}`} delay={(i % 3) * 80} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-lg font-extrabold text-[var(--color-primary)]">
            {t.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
          </span>
          <p className="mt-5 text-lg font-extrabold text-[var(--color-deepgray)]">{t.name}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">{t.specialization ?? 'Personal training'}</p>
          <p className="mt-4 border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-muted)]">
            {t.experienceYears != null ? `${t.experienceYears} years of coaching experience` : 'Ready to help you get started'}
          </p>
        </Reveal>
      ))}
    </ul>
  );
}

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export function Timetable({ classes }: { classes: PublicGym['classes'] }) {
  const days = DAYS.filter((d) => classes.some((c) => c.dayOfWeek === d));
  const unscheduled = classes.filter((c) => !c.dayOfWeek || !DAYS.includes(c.dayOfWeek));
  return (
    <>
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => (
          <div key={day}>
            <p className="border-b border-[var(--color-border)] pb-2 text-sm font-semibold text-[var(--color-primary)]">{titleCase(day)}</p>
            <ul className="mt-3 space-y-2">
              {classes
                .filter((c) => c.dayOfWeek === day)
                .map((c) => (
                  <li key={c.id} className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-[var(--color-deepgray)]">{c.name}</span>
                    <span className="shrink-0 text-[var(--color-muted)]">
                      {c.startTime ? `${c.startTime}${c.endTime ? ` - ${c.endTime}` : ''}` : `${c.duration} min`}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      {unscheduled.length > 0 && (
        <p className="mt-6 text-sm text-[var(--color-muted)]">Also offered: {unscheduled.map((c) => c.name).join(', ')}</p>
      )}
    </>
  );
}

export function JoinBand({ gym, joinUrl }: { gym: PublicGym; joinUrl: string }) {
  return (
    <Reveal className="mt-20 md:mt-28">
      <div className="relative isolate flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[1.75rem] bg-[#141414] p-7 sm:flex-row sm:items-center sm:p-9 md:rounded-[2rem] md:p-11">
        <img src="/gym/hero.webp" alt="" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/75 to-black/55" />
        <div>
          <p className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Ready to start at {gym.name}?</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">Choose a plan, send your membership request and the gym will confirm the next step.</p>
        </div>
        <Link to={joinUrl} className="btn-primary group min-h-12 shrink-0 px-6! py-3!">
          Join this gym
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
        </Link>
      </div>
    </Reveal>
  );
}

export function EnquiryForm({ gymId }: { gymId: string }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const send = useMutation({
    mutationFn: () =>
      sendGymEnquiry(gymId, { name: form.name, phone: form.phone, email: form.email || undefined, notes: form.notes || undefined }),
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  if (send.isSuccess) return <Notice>Thanks, the gym has your details and will get back to you soon.</Notice>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send.mutate();
  };

  const field = 'grid gap-2 text-sm font-semibold text-[var(--color-deepgray)]';
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className={field}>
        Your name
        <input required minLength={2} value={form.name} onChange={set('name')} className="input-field font-normal" />
      </label>
      <label className={field}>
        Phone number
        <input required inputMode="tel" value={form.phone} onChange={set('phone')} className="input-field font-normal" />
      </label>
      <label className={`${field} sm:col-span-2`}>
        Email (optional)
        <input type="email" value={form.email} onChange={set('email')} className="input-field font-normal" />
      </label>
      <label className={`${field} sm:col-span-2`}>
        What would you like to know?
        <textarea rows={3} value={form.notes} onChange={set('notes')} className="input-field font-normal" />
      </label>
      {send.isError && (
        <p role="alert" className="text-sm text-[var(--color-primary)] sm:col-span-2">
          Couldn't send your enquiry. Check the phone number and try again.
        </p>
      )}
      <button type="submit" disabled={send.isPending} className="btn-primary justify-center sm:col-span-2">
        {send.isPending ? 'Sending...' : 'Send enquiry'}
      </button>
    </form>
  );
}
