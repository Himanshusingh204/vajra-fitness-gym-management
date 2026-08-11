import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { KeyRound, ArrowRight, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { resetPassword } from '../api/auth.api';
import { useNotificationStore } from '../store/useNotificationStore';
import { Reveal } from '../components/Reveal';

const resetSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetFormValues = z.infer<typeof resetSchema>;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormValues) => {
    try {
      setError('');
      await resetPassword(token, data.newPassword);
      setDone(true);
      addNotification('success', 'Password reset successfully. Please sign in.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-[var(--color-base)] dark:bg-[var(--color-base)]">
        <div className="w-full max-w-md px-4">
          <div className="glass-strong rounded-3xl p-8 text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-2xl font-extrabold text-[var(--color-deepgray)] dark:text-white">Invalid reset link</h1>
            <p className="text-sm text-[var(--color-muted)]">
              This reset link is missing or invalid. Please request a new one.
            </p>
            <Link to="/forgot-password" className="btn-primary w-full justify-center">Request a new link</Link>
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
              <h1 className="text-3xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-2">Set New Password</h1>
              <p className="text-[var(--color-muted)]">Choose a strong password for your account.</p>
            </div>

            {done ? (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Password reset successfully. Redirecting to sign in...</span>
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
                  <label htmlFor="newPassword" className="block text-sm font-bold text-[var(--color-charcoal)] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={show ? 'text' : 'password'}
                      autoComplete="new-password"
                      {...register('newPassword')}
                      className={`input-field pr-12 ${errors.newPassword ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
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
                  {errors.newPassword && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.newPassword.message}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-[var(--color-charcoal)] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className={`input-field ${errors.confirmPassword ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
                    placeholder="Re-enter new password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full btn-primary">
                    {isSubmitting ? 'Resetting...' : (
                      <>Reset Password <ArrowRight className="w-5 h-5" /></>
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

export default ResetPasswordPage;
