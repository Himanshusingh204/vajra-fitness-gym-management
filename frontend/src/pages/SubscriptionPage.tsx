import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, Check, CreditCard, Banknote, Smartphone, ShieldCheck, Sparkles, Loader2, Building2,
} from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuthStore } from '../store/useAuthStore';
import { getSaaSPlans, getMyGymSubscription, checkoutSubscription, verifySubscriptionPayment, getAllSubscriptions } from '../api/saas.api';
import { getPublicGyms } from '../api/gym.api';
import { getPaymentConfig, loadRazorpayScript } from '../api/payment.api';
import { formatPrice } from '../utils/format';

const PAYMENT_METHODS = [
  {
    id: 'CASH',
    label: 'Cash / Bank (COD)',
    desc: 'Pay at the gym or via bank transfer. Plan activates after payment is confirmed.',
    icon: Banknote,
  },
  {
    id: 'UPI',
    label: 'UPI',
    desc: 'Google Pay, PhonePe, Paytm and more.',
    icon: Smartphone,
  },
  {
    id: 'CARD',
    label: 'Credit / Debit Card',
    desc: 'Visa, Mastercard, RuPay and Amex.',
    icon: CreditCard,
  },
];

const SubscriptionPage = () => {
  usePageMeta(
    'Subscription Plans',
    'Choose a Vajra Fitness platform plan for your gym — Starter, Professional or Enterprise. Pay by cash, UPI or card.',
    '/subscription',
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [gymId, setGymId] = useState('');
  const [success, setSuccess] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [paying, setPaying] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['saas-plans'],
    queryFn: getSaaSPlans,
    staleTime: 60_000,
  });

  const { data: mySub, isLoading: subLoading } = useQuery({
    queryKey: ['my-gym-subscription'],
    queryFn: getMyGymSubscription,
    enabled: user?.role === 'GYM_ADMIN',
  });

  // Super Admins subscribe on behalf of a specific gym, so they pick one here.
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { data: gyms = [], isLoading: gymsLoading } = useQuery({
    queryKey: ['public-gyms'],
    queryFn: getPublicGyms,
    enabled: isSuperAdmin,
  });

  // Super Admin sees which gyms already hold an active/pending subscription
  // so they don't pick one that can't accept another.
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['saas-subscriptions'],
    queryFn: getAllSubscriptions,
    enabled: isSuperAdmin,
  });
  const busyGymIds = new Set(
    subscriptions
      .filter((s) => s.status === 'ACTIVE' || s.status === 'PENDING')
      .map((s) => s.gymId),
  );

  const { data: payConfig } = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: getPaymentConfig,
  });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const alreadySubscribed = !!mySub?.hasSubscription;

  const handleCheckout = async () => {
    setInlineError('');
    setSuccess('');
    if (!selectedPlanId) {
      setInlineError('Please choose a plan first.');
      return;
    }
    if (!user) {
      navigate(`/login?redirect=/subscription`);
      return;
    }
    if (user.role !== 'GYM_ADMIN' && user.role !== 'SUPER_ADMIN') {
      setInlineError('Only gym owners can purchase a platform subscription. Log in with your gym owner account.');
      return;
    }
    if (isSuperAdmin && !gymId) {
      setInlineError('Please select the gym you are purchasing the plan for.');
      return;
    }
    if (paying) return;
    setPaying(true);
    try {
      const checkout = await checkoutSubscription({
        planId: selectedPlanId,
        paymentMethod,
        ...(isSuperAdmin ? { gymId } : {}),
      });

      if (checkout.mode === 'manual') {
        const sub = checkout.subscription;
        const howToPay = paymentMethod === 'CASH'
          ? 'cash / bank transfer at the gym'
          : !payConfig?.enabled
            ? 'cash / bank transfer at the gym (online payments are currently unavailable)'
            : paymentMethod;
        setSuccess(
          `Your ${sub.plan?.name ?? 'subscription'} request is in. Pay ${formatPrice(sub.amount)} via ${howToPay} and the platform will activate your plan shortly.`,
        );
        queryClient.invalidateQueries({ queryKey: ['my-gym-subscription'] });
        queryClient.invalidateQueries({ queryKey: ['myNotifications'] });
        return;
      }

      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error('Payment gateway unavailable');
      const rzp = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Vajra Fitness',
        description: `SaaS subscription · ${formatPrice(checkout.subscription.amount)}`,
        order_id: checkout.orderId,
        handler: async (response: any) => {
          try {
            await verifySubscriptionPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            queryClient.invalidateQueries({ queryKey: ['my-gym-subscription'] });
            queryClient.invalidateQueries({ queryKey: ['myNotifications'] });
            setSuccess(
              `Payment received! Your ${checkout.subscription.plan?.name ?? 'subscription'} is now active.`,
            );
          } catch {
            setInlineError('Payment was not confirmed. Your request stays pending — retry or pay at the gym.');
          }
        },
      });
      rzp.open();
    } catch (err: any) {
      setInlineError(err.response?.data?.error || 'Failed to start checkout. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[var(--color-base)] overflow-x-hidden">
      {/* HERO */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-32 -right-32 w-[34rem] h-[34rem] bg-[var(--color-primary)]/15 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/2 -left-40 w-[30rem] h-[30rem] bg-[var(--color-accent)]/10 rounded-full blur-3xl animate-blob [animation-delay:-8s]" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <span className="eyebrow bg-[var(--color-primary)]/10! text-[var(--color-primary)]! border-[var(--color-primary)]/20!">
              <Sparkles className="w-4 h-4" /> Platform Subscription
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="display mt-8 text-5xl sm:text-6xl md:text-7xl leading-[0.95]">
              Choose your <span className="text-gradient animate-gradient-x">Plan</span>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-6 text-lg text-[var(--color-muted)] max-w-2xl mx-auto">
              Pick a plan for your gym, choose how you'd like to pay, and go live once payment is confirmed.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {subLoading && user?.role === 'GYM_ADMIN' ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" /></div>
        ) : alreadySubscribed ? (
          <div className="max-w-3xl mx-auto text-center card p-10">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center mb-5">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold dark:text-white mb-2">You already have an active subscription</h2>
            <p className="text-[var(--color-muted)] mb-6">
              {mySub?.plan?.name} · {mySub?.status} · valid till {mySub?.endDate ? new Date(mySub.endDate).toLocaleDateString('en-IN') : '—'}
            </p>
            <Link to="/admin/gym" className="btn-primary justify-center">Go to your Dashboard</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-10 items-start">
            {/* Plan cards */}
            <div className="lg:col-span-3 grid md:grid-cols-3 gap-6 stagger">
              {isLoading ? (
                <div className="col-span-3 flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" /></div>
              ) : plans.length === 0 ? (
                <div className="col-span-3 card p-12 text-center text-[var(--color-muted)]">No plans published yet.</div>
              ) : (
                plans.map((plan, i) => {
                  const features = plan.features ?? [];
                  const highlight = plan.code === 'PROFESSIONAL';
                  return (
                    <Reveal key={plan.id} delay={i * 100} className="h-full">
                      <button
                        onClick={() => { setSelectedPlanId(plan.id); setInlineError(''); setSuccess(''); }}
                        className={`w-full h-full text-left rounded-2xl p-6 transition-all duration-300 ${selectedPlanId === plan.id ? 'ring-2 ring-[var(--color-primary)] shadow-xl scale-[1.02]' : 'card-hover'} ${highlight ? 'bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                      >
                        {highlight && (
                          <span className="inline-flex items-center gap-1 chip bg-white text-[var(--color-primary)] mb-3"><Sparkles className="w-3.5 h-3.5" /> Most Popular</span>
                        )}
                        <h3 className={`text-xl font-extrabold ${highlight ? 'text-white' : 'dark:text-white'}`}>{plan.name}</h3>
                        <p className={`text-sm mt-1 ${highlight ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>{plan.description}</p>
                        <div className="flex items-end gap-1 mt-5 mb-6">
                          <span className={`text-sm font-semibold mb-1.5 ${highlight ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>₹</span>
                          <span className="text-4xl font-extrabold tracking-tight">{plan.monthlyPrice.toLocaleString('en-IN')}</span>
                          <span className={`text-sm font-semibold mb-1.5 ${highlight ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>/month</span>
                        </div>
                        <ul className="space-y-2.5">
                          {features.map((f) => (
                            <li key={f} className={`flex items-start gap-2.5 text-sm ${highlight ? 'text-white/85' : 'text-[var(--color-charcoal)] dark:text-gray-300'}`}>
                              <Check className="w-4 h-4 mt-0.5 shrink-0" /> {f}
                            </li>
                          ))}
                          {plan.maxMembers && (
                            <li className={`flex items-start gap-2.5 text-sm ${highlight ? 'text-white/85' : 'text-[var(--color-charcoal)] dark:text-gray-300'}`}>
                              <Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to {plan.maxMembers} members
                            </li>
                          )}
                        </ul>
                      </button>
                    </Reveal>
                  );
                })
              )}
            </div>

            {/* Checkout summary */}
            <div className="lg:col-span-2 lg:sticky lg:top-24">
              <div className="card p-6 space-y-6">
                <h2 className="text-xl font-extrabold dark:text-white">Checkout</h2>

                <div className="p-4 rounded-2xl bg-[var(--color-base-dark)]/60 dark:bg-white/[0.04] text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-muted)]">Plan</span>
                    <span className="font-bold dark:text-white">{selectedPlan?.name ?? '—'}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[var(--color-muted)]">Billing</span>
                    <span className="font-bold dark:text-white">Monthly</span>
                  </div>
                  <div className="flex justify-between mt-2 pt-3 border-t border-[var(--color-border)]">
                    <span className="font-semibold text-[var(--color-muted)]">Total</span>
                    <span className="font-extrabold text-[var(--color-primary)] text-xl">{selectedPlan ? formatPrice(selectedPlan.monthlyPrice) : '—'}</span>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div>
                    <p className="text-sm font-bold text-[var(--color-charcoal)] dark:text-white mb-3">Gym to subscribe</p>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--color-muted)] pointer-events-none" />
                      <select
                        value={gymId}
                        onChange={(e) => { setGymId(e.target.value); setInlineError(''); }}
                        disabled={gymsLoading}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base-dark)]/60 dark:bg-white/[0.04] py-3 pl-10 pr-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 disabled:opacity-50 appearance-none"
                      >
                        <option value="">{gymsLoading ? 'Loading gyms…' : 'Select a gym…'}</option>
                        {gyms.map((g) => {
                          const busy = busyGymIds.has(g.id);
                          return (
                            <option key={g.id} value={g.id} disabled={busy}>
                              {g.name} · {g.city}{busy ? ' · already subscribed' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-bold text-[var(--color-charcoal)] dark:text-white mb-3">Payment Method</p>
                  <div className="space-y-2.5">
                    {PAYMENT_METHODS.map((m) => (
                      <label key={m.id} className={`block cursor-pointer rounded-xl border p-3.5 transition-all ${paymentMethod === m.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/20' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'}`}>
                        <input type="radio" name="paymentMethod" value={m.id} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} className="sr-only" />
                        <span className="flex items-center gap-3">
                          <m.icon className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                          <span>
                            <span className="block font-bold text-sm dark:text-white">{m.label}</span>
                            <span className="block text-xs text-[var(--color-muted)]">{m.desc}</span>
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {inlineError && <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{inlineError}</div>}
                {success && <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">{success}</div>}

                <button onClick={handleCheckout} disabled={paying || !selectedPlanId} className="btn-primary w-full justify-center">
                  {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {user ? 'Proceed to Payment' : 'Log in to Subscribe'} <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  {!user ? (
                    <>You'll need a gym owner account to subscribe. <Link to="/register" className="text-[var(--color-primary)] font-semibold">Register your gym</Link> or <Link to="/login" className="text-[var(--color-primary)] font-semibold">log in</Link>.</>
                  ) : payConfig?.enabled ? (
                    <>UPI and Card payments are secured by Razorpay. For Cash/Bank, the platform activates your plan once payment is confirmed. <ShieldCheck className="inline w-3.5 h-3.5 text-green-500" /> 100% secure.</>
                  ) : (
                    <>Online payments are temporarily unavailable — choose Cash / Bank and pay at the gym, or pay via UPI/Card once online payments are enabled. <ShieldCheck className="inline w-3.5 h-3.5 text-green-500" /></>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;
