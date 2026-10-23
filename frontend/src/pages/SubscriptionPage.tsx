import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Check, CreditCard, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { getSaaSPlans, getMyGymSubscription, checkoutSubscription, verifySubscriptionPayment, getAllSubscriptions, type SaaSPlan } from '../api/saas.api';
import { getPublicGyms } from '../api/gym.api';
import { getPaymentConfig, loadRazorpayScript } from '../api/payment.api';
import { formatPrice } from '../utils/format';
import { Button, Card, EmptyState, Field, PageHeader, Select, Skeleton, cx } from '../components/ui';
import { SITE_URL, pageSeo, useRouteMeta } from '../hooks/usePageMeta';

type Cycle = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

const BILLING_CYCLES: { id: Cycle; label: string; priceKey: 'monthlyPrice' | 'quarterlyPrice' | 'halfYearlyPrice' | 'yearlyPrice'; months: number }[] = [
  { id: 'MONTHLY', label: 'Monthly', priceKey: 'monthlyPrice', months: 1 },
  { id: 'QUARTERLY', label: 'Quarterly', priceKey: 'quarterlyPrice', months: 3 },
  { id: 'HALF_YEARLY', label: 'Half-yearly', priceKey: 'halfYearlyPrice', months: 6 },
  { id: 'YEARLY', label: 'Yearly', priceKey: 'yearlyPrice', months: 12 },
];

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash or bank transfer', desc: 'Pay the platform directly. The plan starts once payment is confirmed.', icon: Banknote },
  { id: 'UPI', label: 'UPI', desc: 'Google Pay, PhonePe, Paytm and others.', icon: Smartphone },
  { id: 'CARD', label: 'Credit or debit card', desc: 'Visa, Mastercard, RuPay and Amex.', icon: CreditCard },
];

const requestError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } }).response?.data?.error || fallback;

const planOffers = (plans: SaaSPlan[]) =>
  plans.map((p) => ({
    '@type': 'Offer',
    name: p.name,
    price: p.monthlyPrice,
    priceCurrency: p.currency || 'INR',
    url: `${SITE_URL}/subscription`,
  }));

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<Cycle>('MONTHLY');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [gymId, setGymId] = useState('');
  const [success, setSuccess] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [paying, setPaying] = useState(false);

  const { data: plans = [], isLoading } = useQuery({ queryKey: ['saas-plans'], queryFn: getSaaSPlans, staleTime: 60_000 });

  useRouteMeta('/subscription', plans.length ? [{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Vajra Fitness', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', offers: planOffers(plans) }] : undefined);

  const { data: mySub, isLoading: subLoading } = useQuery({
    queryKey: ['my-gym-subscription'],
    queryFn: getMyGymSubscription,
    enabled: user?.role === 'GYM_ADMIN',
  });

  // Super admins buy on behalf of a gym, so they pick one here.
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { data: gyms = [], isLoading: gymsLoading } = useQuery({ queryKey: ['public-gyms'], queryFn: getPublicGyms, enabled: isSuperAdmin });
  const { data: subscriptions = [] } = useQuery({ queryKey: ['saas-subscriptions'], queryFn: getAllSubscriptions, enabled: isSuperAdmin });
  const busyGymIds = new Set(subscriptions.filter((s) => s.status === 'ACTIVE' || s.status === 'PENDING').map((s) => s.gymId));

  const { data: payConfig } = useQuery({ queryKey: ['paymentConfig'], queryFn: getPaymentConfig });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const alreadySubscribed = !!mySub?.hasSubscription;
  const activeCycle = BILLING_CYCLES.find((c) => c.id === billingCycle)!;
  const cyclePrice = (plan: SaaSPlan) => plan[activeCycle.priceKey];

  const choosePlan = (id: string) => {
    setSelectedPlanId(id);
    setInlineError('');
    setSuccess('');
  };

  const handleCheckout = async () => {
    setInlineError('');
    setSuccess('');
    if (!selectedPlanId) return setInlineError('Choose a plan first.');
    if (!user) return navigate('/login?redirect=/subscription');
    if (user.role !== 'GYM_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return setInlineError('Only gym owners can buy a platform plan. Log in with your gym owner account.');
    }
    if (isSuperAdmin && !gymId) return setInlineError('Select the gym you are buying the plan for.');
    if (paying) return;

    setPaying(true);
    try {
      const checkout = await checkoutSubscription({
        planId: selectedPlanId,
        paymentMethod,
        billingCycle,
        ...(isSuperAdmin ? { gymId } : {}),
      });

      if (checkout.mode === 'manual') {
        const sub = checkout.subscription;
        const howToPay =
          paymentMethod === 'CASH'
            ? 'cash or bank transfer'
            : !payConfig?.enabled
              ? 'cash or bank transfer (online payments are off right now)'
              : paymentMethod;
        setSuccess(`Your ${sub.plan?.name ?? 'plan'} request is in. Pay ${formatPrice(sub.amount)} by ${howToPay} and the platform will activate it.`);
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
        description: `Platform plan, ${formatPrice(checkout.subscription.amount)}`,
        order_id: checkout.orderId,
        handler: async (response) => {
          try {
            await verifySubscriptionPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            queryClient.invalidateQueries({ queryKey: ['my-gym-subscription'] });
            queryClient.invalidateQueries({ queryKey: ['myNotifications'] });
            setSuccess(`Payment received. Your ${checkout.subscription.plan?.name ?? 'plan'} is now active.`);
          } catch {
            setInlineError('The payment was not confirmed. Your request stays pending, so you can retry or pay another way.');
          }
        },
      });
      rzp.open();
    } catch (err) {
      setInlineError(requestError(err, 'Could not start checkout. Please try again.'));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <PageHeader
        title={pageSeo['/subscription'].h1}
        description="Plans are billed to the gym, not to its members. Choose a plan, pick how to pay and it starts once payment is confirmed."
      />

      <div className="mt-8">
        {subLoading && user?.role === 'GYM_ADMIN' ? (
          <Skeleton className="h-48" />
        ) : alreadySubscribed ? (
          <Card className="mx-auto max-w-2xl text-center">
            <ShieldCheck className="mx-auto size-8 text-success-ink" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-bold text-ink">You already have a plan</h2>
            <p className="mt-1 text-ink-muted">
              {mySub?.plan?.name}, {mySub?.status}, valid till {mySub?.endDate ? new Date(mySub.endDate).toLocaleDateString('en-IN') : 'not set'}
            </p>
            <Button to="/admin/gym" className="mt-5">Go to your dashboard</Button>
          </Card>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-5">
            <section className="lg:col-span-3" aria-labelledby="plans-heading">
              <h2 id="plans-heading" className="sr-only">Plans</h2>
              <div role="group" aria-label="Billing period" className="inline-flex flex-wrap gap-1 rounded-control bg-surface-sunken p-1">
                {BILLING_CYCLES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={billingCycle === c.id}
                    onClick={() => setBillingCycle(c.id)}
                    className={cx(
                      'min-h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold sm:min-h-9',
                      billingCycle === c.id ? 'bg-accent text-on-accent' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}
                </div>
              ) : plans.length === 0 ? (
                <EmptyState className="mt-6" title="No plans are published yet" description="Check back soon, or contact us and we will help you get started." action={<Button to="/contact">Contact us</Button>} />
              ) : (
                <ul className="mt-6 grid gap-4 md:grid-cols-3">
                  {plans.map((plan) => {
                    const selected = selectedPlanId === plan.id;
                    return (
                      <li key={plan.id}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => choosePlan(plan.id)}
                          className={cx(
                            'h-full w-full cursor-pointer rounded-card border bg-surface p-5 text-left transition-colors',
                            selected ? 'border-accent-ink ring-2 ring-accent-ink' : 'border-line hover:border-line-strong',
                          )}
                        >
                          <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                          {plan.description && <p className="mt-1 text-sm text-ink-muted">{plan.description}</p>}
                          <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink tabular-nums">
                            {formatPrice(cyclePrice(plan))}
                            <span className="text-sm font-medium text-ink-muted"> / {activeCycle.label.toLowerCase()}</span>
                          </p>
                          <p className="mt-1 min-h-5 text-xs text-ink-muted">
                            {activeCycle.months > 1 && `About ${formatPrice(Math.round(cyclePrice(plan) / activeCycle.months))} a month`}
                          </p>
                          <ul className="mt-4 space-y-2 text-sm text-ink">
                            {(plan.features ?? []).map((f) => (
                              <li key={f} className="flex items-start gap-2">
                                <Check className="mt-0.5 size-4 shrink-0 text-success-ink" aria-hidden="true" /> {f}
                              </li>
                            ))}
                            {plan.maxMembers && (
                              <li className="flex items-start gap-2">
                                <Check className="mt-0.5 size-4 shrink-0 text-success-ink" aria-hidden="true" /> Up to {plan.maxMembers} members
                              </li>
                            )}
                          </ul>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <Card className="space-y-6 lg:sticky lg:top-24 lg:col-span-2">
              <h2 className="text-xl font-bold text-ink">Checkout</h2>

              <dl className="space-y-2 rounded-control bg-surface-sunken p-4 text-sm">
                <div className="flex justify-between"><dt className="text-ink-muted">Plan</dt><dd className="font-semibold text-ink">{selectedPlan?.name ?? 'None chosen'}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-muted">Billing</dt><dd className="font-semibold text-ink">{activeCycle.label}</dd></div>
                <div className="flex justify-between border-t border-line pt-2"><dt className="font-semibold text-ink-muted">Total</dt><dd className="text-xl font-extrabold text-ink">{selectedPlan ? formatPrice(cyclePrice(selectedPlan)) : '-'}</dd></div>
              </dl>

              {isSuperAdmin && (
                <Field label="Gym to subscribe">
                  <Select value={gymId} onChange={(e) => { setGymId(e.target.value); setInlineError(''); }} disabled={gymsLoading}>
                    <option value="">{gymsLoading ? 'Loading gyms' : 'Select a gym'}</option>
                    {gyms.map((g) => (
                      <option key={g.id} value={g.id} disabled={busyGymIds.has(g.id)}>
                        {g.name}, {g.city}{busyGymIds.has(g.id) ? ' (already subscribed)' : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-ink">Payment method</legend>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((m) => (
                    <label
                      key={m.id}
                      className={cx(
                        'flex min-h-11 cursor-pointer items-start gap-3 rounded-control border p-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
                        paymentMethod === m.id ? 'border-accent-ink bg-accent-soft' : 'border-line hover:border-line-strong',
                      )}
                    >
                      <input type="radio" name="paymentMethod" value={m.id} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} className="sr-only" />
                      <m.icon className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{m.label}</span>
                        <span className="block text-sm text-ink-muted">{m.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {inlineError && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink">{inlineError}</p>}
              {success && <p role="status" className="rounded-control bg-success-soft px-3 py-2 text-sm font-medium text-success-ink">{success}</p>}

              <Button onClick={handleCheckout} loading={paying} disabled={!selectedPlanId} className="w-full">
                {user ? 'Continue to payment' : 'Log in to subscribe'}
              </Button>

              <p className="text-sm text-ink-muted">
                {!user ? (
                  <>You need a gym owner account. <Link to="/register/partner" className="font-semibold text-accent-ink underline underline-offset-2">Register your gym</Link> or <Link to="/login?redirect=/subscription" className="font-semibold text-accent-ink underline underline-offset-2">log in</Link>.</>
                ) : payConfig?.enabled ? (
                  'UPI and card payments are processed by Razorpay. For cash or bank transfer, the platform activates your plan once it confirms the payment.'
                ) : (
                  'Online payments are off right now. Choose cash or bank transfer and the platform will activate your plan once payment is confirmed.'
                )}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
