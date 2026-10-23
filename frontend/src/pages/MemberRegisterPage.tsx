import React, { useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { MapPin, ShieldCheck, UserPlus, LogOut, Banknote, Smartphone, CreditCard, AlertCircle, CheckCircle2, User, Mail, Phone, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { getPublicGyms, enrollMember } from '../api/gym.api';
import { formatDuration, formatPrice } from '../utils/format';
import AuthSplitLayout from '../components/AuthSplitLayout';

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
  const [decideLater, setDecideLater] = useState(false);
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
    if (id) setDecideLater(false);
  };

  const handleDecideLaterToggle = (checked: boolean) => {
    setDecideLater(checked);
    if (checked) {
      setGymId('');
      setPlanId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isLoggedInMember && decideLater) {
      setError('Please select a gym, or come back to this page later.');
      return;
    }

    if (!decideLater) {
      if (!gymId || !gym) {
        setError('Please select a gym, or choose "I\'ll pick a gym later" below.');
        return;
      }
      if (!planId) {
        setError('Please choose a membership plan.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isLoggedInMember) {
        await enrollMember(gymId, planId, preferredPaymentMethod);
        navigate('/dashboard', { replace: true });
      } else {
        const payload = decideLater
          ? { ...formData }
          : { ...formData, gymId, planId, preferredPaymentMethod };
        const response = await api.post('/auth/register/member', payload);
        const { token, user: newUser } = response.data;
        setAuth(newUser, token);
        setSuccess(decideLater
          ? 'Account created! Redirecting to your dashboard — you can browse gyms any time.'
          : 'Registration successful! Redirecting to your dashboard...');
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
    <AuthSplitLayout
      badge="Member Sign Up"
      title={isLoggedInMember ? 'Join a New Gym' : 'Create Member Account'}
      subtitle={
        isLoggedInMember
          ? 'Pick your target gym and membership plan below — request is processed instantly.'
          : 'Select your preferred gym and plan, or sign up now and choose a fitness center later.'
      }
      imageSrc="/images/auth-login.jpg"
      imageAlt="Vajra Fitness Gym Training"
      quote="The real workout starts when you want to stop. Unleash your full potential."
      quoteAuthor="Vajra Athlete Community"
      features={[
        { title: 'Touchless Entry', description: 'Personal QR pass' },
        { title: 'Goal Tracking', description: 'Weight & attendance logs' },
        { title: 'Certified Coaches', description: 'Custom nutrition & guidance' },
      ]}
      maxWidth="max-w-2xl"
    >
      {user && !isLoggedInMember && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 text-xs">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            You are logged in as {user.role.replace('_', ' ')} ({user.email}).
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-outline px-3 py-1.5 text-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Gym Selection */}
        <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-[var(--color-base)]/50 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-charcoal)] dark:text-white">
              Choose Your Gym & Plan
            </h2>
          </div>

          {gymsLoading ? (
            <div className="space-y-3">
              <div className="h-10 bg-black/5 dark:bg-white/5 animate-pulse rounded-xl" />
              <div className="h-24 bg-black/5 dark:bg-white/5 animate-pulse rounded-xl" />
            </div>
          ) : (
            <>
              <label htmlFor="member-gym-select" className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                {gyms.length === 0 ? 'No partner gyms found' : 'Select Gym Partner'}
              </label>
              <select
                id="member-gym-select"
                value={gymId}
                onChange={(e) => handleGymChange(e.target.value)}
                disabled={decideLater}
                className="input-field bg-white! dark:bg-[#1a1a1a]! disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                required={!decideLater}
              >
                <option value="">Choose a gym…</option>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.city}
                  </option>
                ))}
              </select>

              {!isLoggedInMember && (
                <label className="mt-3 flex items-start gap-2.5 rounded-xl border border-[var(--color-border)] p-3 cursor-pointer hover:border-[var(--color-primary)]/40 transition-colors bg-[var(--color-surface)]">
                  <input
                    type="checkbox"
                    checked={decideLater}
                    onChange={(e) => handleDecideLaterToggle(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--color-primary)] cursor-pointer"
                  />
                  <span className="text-xs">
                    <span className="block font-bold text-[var(--color-charcoal)] dark:text-white">I'll pick a gym later</span>
                    <span className="block text-[var(--color-muted)] mt-0.5">Create your member profile now and explore gyms anytime.</span>
                  </span>
                </label>
              )}
            </>
          )}

          {gym && !decideLater && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl overflow-hidden border border-[var(--color-border)] relative h-28">
                <img
                  src={gym.imageUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80'}
                  alt={gym.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-extrabold text-sm text-white">{gym.name}</h3>
                  <p className="flex items-center gap-1 text-xs text-white/80 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-primary-light)]" />
                    <span>{gym.location || `${gym.city}, ${gym.state}`}</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-2">
                  Select Membership Plan *
                </label>
                {gym.membershipPlans.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted)]">No published plans for this gym yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {gym.membershipPlans.map((plan) => (
                      <label
                        key={plan.id}
                        className={`block cursor-pointer rounded-xl border p-3 transition-all ${
                          planId === plan.id
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]/30'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40'
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
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-[var(--color-charcoal)] dark:text-white">
                            {plan.name}
                          </span>
                          <span className="font-extrabold text-xs text-[var(--color-primary)]">
                            {formatPrice(plan.price)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-muted)] mt-1 line-clamp-1">
                          {plan.description || `${formatDuration(plan.duration)} access`}
                        </p>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: Profile Details */}
        <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-[var(--color-base)]/50 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-charcoal)] dark:text-white">
              {isLoggedInMember ? 'Verify Account' : 'Personal Details'}
            </h2>
          </div>

          {isLoggedInMember ? (
            <div className="p-3.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-xs">
              <p className="flex items-center gap-2 font-bold text-[var(--color-primary)]">
                <ShieldCheck className="w-4 h-4" /> Signed in as {user.username}
              </p>
              <p className="text-[var(--color-muted)] mt-1">{user.email}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-muted)]">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    className="input-field pl-9 text-sm"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-muted)]">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    className="input-field pl-9 text-sm"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-muted)]">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="tel"
                    className="input-field pl-9 text-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-muted)]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    className="input-field pl-9 text-sm"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          {!decideLater && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-2">
                Preferred Payment Option
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
                  { id: 'CARD', label: 'Credit/Debit Card', icon: CreditCard },
                  { id: 'CASH', label: 'Pay at Desk', icon: Banknote },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      preferredPaymentMethod === m.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/30'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m.id}
                      checked={preferredPaymentMethod === m.id}
                      onChange={() => setPreferredPaymentMethod(m.id)}
                      className="sr-only"
                    />
                    <m.icon className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                    <span className="text-xs font-bold text-[var(--color-charcoal)] dark:text-white truncate">
                      {m.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting || gymsLoading}
            className="w-full btn-primary py-3.5 text-base shadow-lg cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing request...
              </span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>
                  {decideLater
                    ? 'Create Member Account'
                    : isLoggedInMember
                      ? 'Confirm Gym Request'
                      : 'Join & Request Membership'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Switcher back to login */}
      <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-muted)]">
        {isLoggedInMember ? (
          <>
            Wrong user?{' '}
            <button
              type="button"
              onClick={handleLogout}
              className="text-[var(--color-primary)] font-bold hover:underline cursor-pointer"
            >
              Switch Account
            </button>
          </>
        ) : (
          <>
            Already a registered member?{' '}
            <Link to="/login" className="text-[var(--color-primary)] font-bold hover:underline">
              Sign In Here
            </Link>
          </>
        )}
      </div>
    </AuthSplitLayout>
  );
};

export default MemberRegisterPage;
