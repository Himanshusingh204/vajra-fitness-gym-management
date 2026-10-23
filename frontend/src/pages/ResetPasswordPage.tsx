import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { KeyRound, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { resetPassword } from '../api/auth.api';
import { useNotificationStore } from '../store/useNotificationStore';
import AuthSplitLayout from '../components/AuthSplitLayout';

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

  return (
    <AuthSplitLayout
      badge="Security Check"
      title="Set New Password"
      subtitle={token ? 'Choose a strong new password for your account.' : 'Password reset link is missing or invalid.'}
      imageSrc="/images/auth-login.jpg"
      imageAlt="Vajra Security"
      quote="Security is strength. Keep your credentials protected."
      quoteAuthor="Vajra Cloud Guard"
      features={[
        { title: '8+ Characters', description: 'With letters & numbers' },
        { title: 'Instant Invalidation', description: 'Old sessions cleared' },
        { title: 'Encrypted Vault', description: 'Argon2 hashing' },
      ]}
      maxWidth="max-w-md"
    >
      {!token ? (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl text-sm font-medium flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold">Missing or Expired Token</p>
              <p className="mt-1 text-xs">This reset link is no longer valid. Please submit a new request.</p>
            </div>
          </div>
          <Link to="/forgot-password" className="btn-primary w-full justify-center">
            Request New Link
          </Link>
        </div>
      ) : done ? (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm font-medium flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-bold">Password Updated Successfully</p>
            <p className="mt-1 text-xs">Redirecting you to the sign in page...</p>
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
            <label htmlFor="newPassword" className="block text-sm font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="newPassword"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('newPassword')}
                className={`input-field pl-10 pr-12 ${errors.newPassword ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
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
            {errors.newPassword && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
              Confirm New Password
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
                  Updating Password...
                </span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Update Password</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Switcher back to login */}
      <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-muted)]">
        Remembered your password?{' '}
        <Link to="/login" className="text-[var(--color-primary)] font-bold hover:underline">
          Sign In
        </Link>
      </div>
    </AuthSplitLayout>
  );
};

export default ResetPasswordPage;
