import React, { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { KeyRound, ArrowRight, MailCheck, Mail, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../api/auth.api';
import { useNotificationStore } from '../store/useNotificationStore';
import AuthSplitLayout from '../components/AuthSplitLayout';

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
    <AuthSplitLayout
      badge="Account Recovery"
      title="Forgot Password"
      subtitle="Enter your account email to receive a password recovery link."
      imageSrc="/images/auth-login.jpg"
      imageAlt="Vajra Athlete Recovery"
      quote="Focus on consistency over perfection. Every setback is setup for a comeback."
      quoteAuthor="Vajra Performance Principles"
      features={[
        { title: 'Secure Link', description: 'Expires automatically' },
        { title: 'Fast Reset', description: 'One-click password change' },
        { title: '24/7 Support', description: 'Assisted recovery available' },
      ]}
      maxWidth="max-w-md"
    >
      {sent ? (
        <div className="space-y-5">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm font-medium flex items-start gap-3">
            <MailCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-bold">Reset link sent successfully!</p>
              <p className="mt-1 text-xs text-emerald-600/90 dark:text-emerald-400/90">
                If an account exists for that email, instructions have been delivered to your inbox.
              </p>
            </div>
          </div>

          {devLink && (
            <div className="p-3.5 bg-[var(--color-base)] dark:bg-white/5 border border-[var(--color-border)] rounded-xl text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">
                Development Reset Link
              </p>
              <a
                href={devLink}
                className="text-xs text-[var(--color-primary)] font-semibold break-all hover:underline"
              >
                {devLink}
              </a>
            </div>
          )}

          <Link
            to="/login"
            className="w-full btn-outline py-3 text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      ) : (
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3.5 text-base shadow-lg cursor-pointer"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending Link...
                </span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Password Reset Link</span>
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

export default ForgotPasswordPage;
