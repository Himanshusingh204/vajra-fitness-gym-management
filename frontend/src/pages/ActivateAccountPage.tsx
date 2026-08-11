import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { KeyRound, ArrowRight, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { activateAccount } from '../api/auth.api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { Reveal } from '../components/Reveal';

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

  if (!token) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-[var(--color-base)] dark:bg-[var(--color-base)]">
        <div className="w-full max-w-md px-4">
          <div className="glass-strong rounded-3xl p-8 text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-2xl font-extrabold text-[var(--color-deepgray)] dark:text-white">Invalid activation link</h1>
            <p className="text-sm text-[var(--color-muted)]">
              This activation link is missing or invalid. Please contact your gym for a new link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center relative overflow-hidden bg-[var(--color-base)] dark:bg-[var(--color-base)]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-full max-h-[600px] bg-[var(--color-primary)]/20 dark:bg-[var(--color-primary)]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md px-4 relative z-10">
        <Reveal variant="scale">
          <div className="glass-strong rounded-3xl p-8 sm:p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <KeyRound className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-2">Activate Your Account</h1>
              <p className="text-[var(--color-muted)]">Set your password to activate your account.</p>
            </div>

            {done ? (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Account activated successfully. Redirecting to your dashboard...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-[var(--color-charcoal)] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={show ? 'text' : 'password'}
                      autoComplete="new-password"
                      {...register('password')}
                      className={`input-field pr-12 ${errors.password ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-muted)] hover:text-[var(--color-charcoal)] transition-colors"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.password.message}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-[var(--color-charcoal)] mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className={`input-field ${errors.confirmPassword ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
                    placeholder="Re-enter password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full btn-primary">
                    {isSubmitting ? 'Activating...' : (
                      <>Activate Account <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default ActivateAccountPage;
