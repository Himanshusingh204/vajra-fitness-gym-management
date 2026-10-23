import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LogIn, ArrowRight, Eye, EyeOff, Mail, Lock, AlertCircle, Dumbbell, Building2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import AuthSplitLayout from '../components/AuthSplitLayout';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError('');

      const response = await api.post('/auth/login', data);

      setAuth(response.data.user, response.data.token);

      // Honor a safe same-site redirect (e.g. /subscription after login).
      const redirect = new URLSearchParams(location.search).get('redirect');
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        navigate(redirect);
        return;
      }

      const role = response.data.user.role;
      if (role === 'SUPER_ADMIN') navigate('/admin/super');
      else if (role === 'GYM_ADMIN') navigate('/admin/gym');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials or server error.');
    }
  };

  return (
    <AuthSplitLayout
      badge="Secure Portal"
      title="Welcome Back"
      subtitle="Sign in with your email to access your gym dashboard or member profile."
      imageSrc="/images/auth-login.jpg"
      imageAlt="Vajra Fitness Athlete"
      quote="Discipline is the bridge between your goals and your achievements."
      quoteAuthor="The Vajra Code"
      features={[
        { title: 'Instant QR Access', description: 'Touchless entry' },
        { title: 'Unified Billing', description: 'Real-time invoices' },
        { title: 'Cloud Sync', description: 'Live across all devices' },
      ]}
      maxWidth="max-w-md"
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className={`input-field pl-10 ${errors.email ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
              placeholder="you@example.com"
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-bold text-[var(--color-charcoal)] dark:text-gray-200">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              className={`input-field pl-10 pr-12 ${errors.password ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-muted)] hover:text-[var(--color-charcoal)] transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.password.message}</p>}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-3.5 text-base shadow-lg cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Navigation Switchers */}
      <div className="mt-8 border-t border-[var(--color-border)] pt-6 space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-base)] dark:bg-white/5 border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <span className="block font-bold text-[var(--color-charcoal)] dark:text-white">Looking for workout access?</span>
            <span className="text-[var(--color-muted)]">Join your favorite local gym</span>
          </div>
          <Link
            to="/register/member"
            className="text-xs font-bold text-[var(--color-primary)] hover:underline whitespace-nowrap"
          >
            Join as Member →
          </Link>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-base)] dark:bg-white/5 border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <span className="block font-bold text-[var(--color-charcoal)] dark:text-white">Are you a gym business owner?</span>
            <span className="text-[var(--color-muted)]">Upgrade to Vajra Gym Management</span>
          </div>
          <Link
            to="/register"
            className="text-xs font-bold text-[var(--color-accent)] hover:underline whitespace-nowrap"
          >
            Partner with Us →
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
};

export default LoginPage;
