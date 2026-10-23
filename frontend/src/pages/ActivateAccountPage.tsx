import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle, Lock, ShieldCheck } from 'lucide-react';
import { activateAccount } from '../api/auth.api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import AuthSplitLayout from '../components/AuthSplitLayout';

const activateSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ActivateFormValues = z.infer<typeof activateSchema>;

const ActivateAccountPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ActivateFormValues>({
    resolver: zodResolver(activateSchema),
  });

  const onSubmit = async (data: ActivateFormValues) => {
    try {
      setError('');
      const response = await activateAccount(token, data.password);
      setAuth(response.user, response.token);
      setDone(true);
      addNotification('success', 'Account activated successfully. Welcome!');
      const role = response.user.role;
      setTimeout(() => navigate(role === 'GYM_ADMIN' ? '/admin/gym' : '/dashboard'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate account.');
    }
  };

  return (
    <AuthSplitLayout
      badge="Account Activation"
      title="Activate Account"
      subtitle={token ? 'Set your permanent password to activate your access.' : 'The activation link is missing or invalid.'}
      imageSrc="/images/auth-login.jpg"
      imageAlt="Vajra Account Activation"
      quote="Great things never came from comfort zones. Welcome to the team."
      quoteAuthor="Vajra Onboarding"
      features={[
        { title: 'Instant Activation', description: 'Immediate dashboard access' },
        { title: 'Secure Setup', description: 'Zero plaintext passwords' },
        { title: 'Role Permissions', description: 'Personalized workspace' },
      ]}
      maxWidth="max-w-md"
    >
      {!token ? (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl text-sm font-medium flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold">Invalid Activation Link</p>
              <p className="mt-1 text-xs">This activation token is missing or has expired. Please contact your gym administrator for a fresh invite.</p>
            </div>
          </div>
        </div>
      ) : done ? (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm font-medium flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-bold">Account Activated Successfully</p>
            <p className="mt-1 text-xs">Redirecting to your dashboard...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
              Set Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('password')}
                className={`input-field pl-10 pr-12 ${errors.password ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-muted)] hover:text-[var(--color-charcoal)] transition-colors cursor-pointer"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="confirmPassword"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('confirmPassword')}
                className={`input-field pl-10 pr-12 ${errors.confirmPassword ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
                placeholder="Re-enter password"
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.confirmPassword.message}</p>
            )}
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
                  Activating...
                </span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Activate My Account</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </AuthSplitLayout>
  );
};

export default ActivateAccountPage;
