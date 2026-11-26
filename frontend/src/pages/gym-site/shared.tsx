import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { sendGymEnquiry, type PublicGym } from '../../api/gym.api';
import { DAYS, useGymSite } from './gymData';
import { Reveal } from '../../components/Reveal';
import { formatDuration, formatPrice } from '../../utils/format';
import { createPlanOrder, getPaymentConfig, loadRazorpayScript, verifyPlanOrder } from '../../api/payment.api';
import type { RazorpayPaymentResponse } from '../../types/razorpay';
import { useAuthStore } from '../../store/useAuthStore';

export const Section = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <Reveal as="section" className="mt-16 md:mt-24">
    <div className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] pb-4">
      <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-[var(--color-deepgray)] md:text-3xl">
        <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full bg-[var(--gym-accent)]" />
        {title}
      </h2>
      {action}
    </div>
    <div className="mt-6 md:mt-8">{children}</div>
  </Reveal>
);

export const TextLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]">
    {children}
    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
  </Link>
);

// Sub-page header: back to the gym, a plain title, and one of the gym's own photos on wider screens
export function GymPageIntro({ eyebrow, title, description, photo = 1 }: { eyebrow: string; title: string; description: string; photo?: number }) {
  const { gym, base, images } = useGymSite();
  const cover = images[0];
  const side = images[photo % images.length];
  return (
    <section className="grid items-stretch gap-8 pt-6 sm:pt-8 md:grid-cols-[minmax(0,1fr)_22rem] md:pt-12 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="min-w-0">
        <Link to={base} className="group inline-flex min-h-11 max-w-full items-center gap-3 rounded-full py-1 pl-1 pr-4 text-sm font-semibold text-[var(--color-charcoal)] ring-1 ring-[var(--color-border)] transition-colors hover:ring-[var(--color-border-strong)]">
          {cover && <img src={cover.src} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />}
          <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" />
          <span className="truncate">{gym.name}</span>
        </Link>
        <p className="mt-9 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">
          {eyebrow} <span aria-hidden="true">·</span> {gym.location || gym.city}
        </p>
        <h1 className="mt-3 break-words font-display text-5xl uppercase leading-[0.95] tracking-wide text-[var(--color-deepgray)] sm:text-6xl lg:text-7xl">{title}</h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">{description}</p>
        <div className="mt-8 flex items-center gap-3 border-t border-[var(--color-border)] pt-5 text-sm text-[var(--color-muted)]">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--gym-accent)]" />
          <span className="truncate font-medium">{gym.name}</span><span aria-hidden="true">/</span><span>{gym.city}</span>
        </div>
      </div>
      {side && (
        <div className="relative hidden min-h-64 overflow-hidden rounded-2xl bg-[var(--color-base-dark)] md:block">
          <img src={side.src} alt={side.alt} className="h-full w-full object-cover" />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1.5 bg-[var(--gym-accent)]" />
        </div>
      )}
    </section>
  );
}

export const Notice = ({ children }: { children: ReactNode }) => (
  <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-5 text-sm text-[var(--color-muted)]">{children}</p>
);

// Members buy through Kavach; the verify call or the webhook activates the membership, whichever lands first.
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
        handler: async (r: RazorpayPaymentResponse) => {
          // Best effort: if this fails the webhook still activates the membership.
          await verifyPlanOrder({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }).catch(() => undefined);
          navigate('/dashboard');
        },
      }).open();
    } catch {
      // Errors are surfaced by the global API interceptor.
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={buy} disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2">
      {busy ? 'Opening checkout...' : 'Buy online'}
    </button>
  );
}

const AVG_DAYS_IN_MONTH = 30.4;

// A price list rather than cards: name on the left, price on the right, so plans compare at a glance on a phone
export function PlanGrid({ plans, limit, gymId }: { plans: PublicGym['plans']; limit?: number; gymId?: string }) {
  const { joinUrl } = useGymSite();
  const shown = limit ? plans.slice(0, limit) : plans;
  const isMember = useAuthStore((s) => s.user?.role === 'MEMBER');
  const { data: payConfig } = useQuery({ queryKey: ['paymentConfig'], queryFn: getPaymentConfig, enabled: !!gymId && isMember });
  const canBuy = !!gymId && isMember && !!payConfig?.enabled;
  return (
    <ul>
      {shown.map((p, i) => {
        const months = Math.round(p.duration / AVG_DAYS_IN_MONTH);
        return (
          <Reveal
            as="li"
            key={p.id}
            delay={i * 60}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-4 border-b border-[var(--color-border)] py-5 first:pt-1 sm:grid-cols-[minmax(0,1fr)_auto_10rem] sm:items-center sm:py-6"
          >
            <div className="min-w-0">
              <p className="break-words text-lg font-bold text-[var(--color-deepgray)] sm:text-xl">{p.name}</p>
              {p.description && <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{p.description}</p>}
            </div>
            <p className="text-right">
              <span className="text-2xl font-extrabold tabular-nums tracking-tight text-[var(--color-deepgray)] sm:text-3xl">{formatPrice(p.price)}</span>
              <span className="block text-sm text-[var(--color-muted)]">for {formatDuration(p.duration)}</span>
              {months > 1 && <span className="block text-xs tabular-nums text-[var(--color-muted)]">about {formatPrice(Math.round(p.price / months))} a month</span>}
            </p>
            <div className="col-span-2 min-w-40 justify-self-end sm:col-span-1 sm:w-full">
              {canBuy ? (
                <BuyPlanButton gymId={gymId} plan={p} />
              ) : (
                <Link to={`${joinUrl}&plan=${p.id}`} className="btn-outline min-h-11 w-full">
                  Choose plan
                </Link>
              )}
            </div>
          </Reveal>
        );
      })}
    </ul>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export function TrainerList({ trainers, limit }: { trainers: PublicGym['trainers']; limit?: number }) {
  const shown = limit ? trainers.slice(0, limit) : trainers;
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((t, i) => (
        <Reveal as="li" key={`${t.name}-${i}`} delay={(i % 3) * 60} className="flex items-center gap-4 border-b border-[var(--color-border)] py-5">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--gym-accent)_16%,var(--color-surface))] font-display text-2xl tracking-wide text-[var(--color-deepgray)]"
          >
            {initials(t.name)}
          </span>
          <div className="min-w-0">
            <p className="break-words text-lg font-bold text-[var(--color-deepgray)]">{t.name}</p>
            <p className="text-sm text-[var(--color-muted)]">
              {[t.specialization, t.experienceYears != null && `${t.experienceYears} years coaching`].filter(Boolean).join(' · ') || 'Trainer'}
            </p>
          </div>
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
  const { images } = useGymSite();
  const photo = images[2] ?? images[0];
  return (
    <Reveal className="mt-16 md:mt-24">
      <div className="relative isolate flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl bg-[var(--color-section-dark)] p-7 sm:flex-row sm:items-center sm:p-9 md:p-11">
        {photo && <img src={photo.src} alt="" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/75 to-black/50" />
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-[var(--gym-accent)]" />
        <div>
          <p className="font-display text-4xl uppercase leading-none tracking-wide text-white md:text-5xl">Start at {gym.name}</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">Send a join request with the plan you want. The gym confirms your start date.</p>
        </div>
        <Link to={joinUrl} className="btn-primary group min-h-12 shrink-0 px-6!">
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
