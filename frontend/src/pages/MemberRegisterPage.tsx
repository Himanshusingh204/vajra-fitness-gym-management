import React, { useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { MapPin, Dumbbell, ShieldCheck, UserPlus, LogOut, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { getPublicGyms, enrollMember } from '../api/gym.api';
import { formatDuration, formatPrice } from '../utils/format';

const MemberRegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setAuth = useAuthStore((s) => s.setAuth);

  const preselectId = searchParams.get('gym') || '';
  const { data: gyms = [], isLoading: gymsLoading } = useQuery({
    queryKey: ['public-gyms'],
    queryFn: getPublicGyms,
    staleTime: 60_000,
  });

  const [gymId, setGymId] = useState(preselectId);
  const [planId, setPlanId] = useState('');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState('UPI');
  const [formData, setFormData] = useState({ username: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const gym = useMemo(() => gyms.find((g) => g.id === gymId), [gyms, gymId]);
  const isLoggedInMember = user?.role === 'MEMBER';

  const handleGymChange = (id: string) => {
    setGymId(id);
    setPlanId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!gymId || !gym) {
      setError('Please select a gym.');
      return;
    }

    if (!planId) {
      setError('Please choose a membership plan.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLoggedInMember) {
        await enrollMember(gymId, planId, preferredPaymentMethod);
        navigate('/dashboard', { replace: true });
      } else {
        const payload = { ...formData, gymId, planId, preferredPaymentMethod };
        const response = await api.post('/auth/register/member', payload);
        const { token, user: newUser } = response.data;
        setAuth(newUser, token);
        setSuccess('Registration successful! Redirecting to your dashboard...');
        setTimeout(() => navigate('/dashboard'), 2500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate(0);
  };

  return (
    <div className="min-h-screen pt-28 pb-20 bg-[var(--color-base)] dark:bg-[#0d0d0d] px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-10">
          <span className="eyebrow bg-[var(--color-primary)]/10! text-[var(--color-primary)]! border-[var(--color-primary)]/20!">
            <Dumbbell className="w-4 h-4" />
            Membership Registration
          </span>
          <h1 className="display mt-4 text-4xl sm:text-5xl leading-[1.02]">
            {isLoggedInMember ? 'Join a New Gym' : 'Create your member account'}
          </h1>
          <p className="mt-4 text-[var(--color-muted)]">
            {isLoggedInMember
              ? 'Pick your gym and plan below — your membership request will be sent instantly.'
              : 'Pick a gym and plan, then set up your account. You\'ll log in once the gym approves your request.'}
          </p>
        </div>

        {user && !isLoggedInMember && (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              You're logged in as {user.role.replace('_', ' ')} ({user.email}). Member registration creates a separate member account.
            </p>
            <button onClick={handleLogout} className="btn-outline px-5! py-2! text-sm shrink-0">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm border border-red-200 dark:border-red-500/20">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 p-4 rounded-xl text-sm border border-green-200 dark:border-green-500/20">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-8 items-start">
          {/* STEP 1: Gym */}
          <div className="card p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white text-sm font-extrabold flex items-center justify-center shrink-0">1</span>
              <h2 className="text-xl font-extrabold text-[var(--color-deepgray)] dark:text-white">Choose your gym</h2>
            </div>

            {gymsLoading ? (
              <div className="space-y-3">
                <div className="h-12 bg-[var(--color-base-dark)] dark:bg-white/5 animate-pulse rounded-xl" />
                <div className="h-48 bg-[var(--color-base-dark)] dark:bg-white/5 animate-pulse rounded-xl" />
              </div>
            ) : (
              <>
                <label className="block text-sm font-semibold text-[var(--color-charcoal)] dark:text-gray-300 mb-1.5">
                  {gyms.length === 0 ? 'No gyms available yet' : 'Select Gym'}
                </label>
                <select
                  value={gymId}
                  onChange={(e) => handleGymChange(e.target.value)}
                  className="input-field bg-white! dark:bg-[#1a1a1a]!"
                  required
                >
                  <option value="">Select a gym…</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.city}
                    </option>
                  ))}
                </select>
              </>
            )}

            {gym && (
              <div className="mt-5">
                <div className="rounded-2xl overflow-hidden border border-[var(--color-border)]">
                  <div className="relative h-36">
                    <img
                      src={gym.imageUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80'}
                      alt={gym.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-extrabold text-white">{gym.name}</h3>
                      <p className="flex items-center gap-1.5 text-sm text-white/80 mt-0.5">
                        <MapPin className="w-4 h-4" /> {gym.location || `${gym.city}, ${gym.state}`}
                      </p>
                    </div>
                  </div>
                </div>

                <label className="block text-sm font-semibold text-[var(--color-charcoal)] dark:text-gray-300 mb-1.5 mt-6">
                  Select Membership Plan
                </label>
                {gym.membershipPlans.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">This gym hasn't published any plans yet.</p>
                ) : (
                  <div className="space-y-3">
                    {gym.membershipPlans.map((plan) => (
                      <label
                        key={plan.id}
                        className={`block cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                          planId === plan.id
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-2 ring-[var(--color-primary)]/25'
                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="planId"
                          value={plan.id}
                          checked={planId === plan.id}
                          onChange={() => setPlanId(plan.id)}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-[var(--color-charcoal)] dark:text-white">
                            {plan.name}
                          </span>
                          <span className="font-extrabold text-[var(--color-primary)]">
                            {formatPrice(plan.price)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-muted)] mt-1.5">
                          {plan.description || `Full access for ${formatDuration(plan.duration)}`} · {formatDuration(plan.duration)}
                        </p>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Account */}
          <div className="card p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white text-sm font-extrabold flex items-center justify-center shrink-0">2</span>
              <h2 className="text-xl font-extrabold text-[var(--color-deepgray)] dark:text-white">
                {isLoggedInMember ? 'Confirm your membership' : 'Your details'}
              </h2>
            </div>

            {isLoggedInMember ? (
              <div className="space-y-5">
                <div className="rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 p-5">
                  <p className="flex items-center gap-2.5 text-sm font-semibold text-[var(--color-primary)]">
                    <ShieldCheck className="w-5 h-5" /> Logged in as {user.username}
                  </p>
                  <p className="text-sm text-[var(--color-muted)] mt-1">{user.email}</p>
                </div>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  Submitting this request will link your account to <span className="font-bold text-[var(--color-charcoal)] dark:text-white">{gym?.name}</span> and the selected plan. The gym admin will approve it from their dashboard.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-charcoal)] dark:text-gray-300 mb-1.5">Full Name</label>
                  <input
                    className="input-field"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-charcoal)] dark:text-gray-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-charcoal)] dark:text-gray-300 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-charcoal)] dark:text-gray-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Create a password"
                    minLength={6}
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 3: Payment method */}
            <div className="mt-6">
              <p className="text-sm font-bold text-[var(--color-charcoal)] dark:text-white mb-3">How would you like to pay?</p>
              <div className="space-y-2.5">
                {[
                  { id: 'CASH', label: 'Pay at Gym (COD)', desc: 'Pay cash at the front desk after approval.', icon: Banknote },
                  { id: 'UPI', label: 'UPI', desc: 'Google Pay, PhonePe, Paytm — pay online securely.', icon: Smartphone },
                  { id: 'CARD', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay — pay online securely.', icon: CreditCard },
                ].map((m) => (
                  <label key={m.id} className={`block cursor-pointer rounded-xl border p-3.5 transition-all ${preferredPaymentMethod === m.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/20' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'}`}>
                    <input type="radio" name="paymentMethod" value={m.id} checked={preferredPaymentMethod === m.id} onChange={() => setPreferredPaymentMethod(m.id)} className="sr-only" />
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

            <button
              type="submit"
              disabled={isSubmitting || gymsLoading}
              className="btn-primary w-full mt-8 py-4! text-lg justify-center"
            >
              <UserPlus className="w-5 h-5" />
              {isSubmitting
                ? 'Submitting…'
                : isLoggedInMember
                  ? 'Confirm Membership Request'
                  : 'Create Account & Request Membership'}
            </button>

            <div className="mt-5 text-center text-sm text-[var(--color-muted)]">
              {isLoggedInMember ? (
                <>
                  Wrong account? <button type="button" onClick={handleLogout} className="text-[var(--color-primary)] font-semibold hover:underline">Switch account</button>
                </>
              ) : (
                <>
                  Already a member? <Link to="/login" className="text-[var(--color-primary)] font-semibold hover:underline">Login Here</Link>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberRegisterPage;
