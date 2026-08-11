import React, { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { KeyRound, ArrowRight, MailCheck } from 'lucide-react';
import { forgotPassword } from '../api/auth.api';
import { useNotificationStore } from '../store/useNotificationStore';
import { Reveal } from '../components/Reveal';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

const ForgotPasswordPage = () => {
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');
  const addNotification = useNotificationStore((s) => s.addNotification);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormValues) => {
    try {
      const response = await forgotPassword(data.email);
      setSent(true);
      if (response.resetLink) setDevLink(response.resetLink);
    } catch (err: any) {
      addNotification('error', err.response?.data?.error || 'Failed to process your request.');
    }
  };

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
              <h1 className="text-3xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-2">Forgot Password</h1>
              <p className="text-[var(--color-muted)]">
                Enter your registered email and we will send you a link to reset your password.
              </p>
            </div>

            {sent ? (
              <div className="text-center space-y-4">
                <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium">
                  <MailCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>If an account exists for this email, a reset link has been generated.</span>
                </div>
                {devLink && (
                  <div className="p-3 bg-[var(--color-base)] border border-[var(--color-border)] rounded-xl text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">
                      Development reset link
                    </p>
                    <p className="text-sm text-[var(--color-primary)] break-all">{devLink}</p>
                  </div>
                )}
                <Link to="/login" className="btn-ghost w-full justify-center text-sm">
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-[var(--color-charcoal)] mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className={`input-field ${errors.email ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.email.message}</p>}
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full btn-primary">
                    {isSubmitting ? 'Sending...' : (
                      <>Send Reset Link <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 text-center border-t border-[var(--color-border)] pt-6">
              <p className="text-sm text-[var(--color-muted)] font-medium">
                Remembered your password?{' '}
                <Link to="/login" className="text-[var(--color-primary)] font-bold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
