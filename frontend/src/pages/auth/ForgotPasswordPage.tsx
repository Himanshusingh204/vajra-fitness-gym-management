import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MailCheck } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AuthPageFrame } from '../../layouts/AuthLayout';
import { Button, Field, Input } from '../../components/ui';
import { forgotPassword } from '../../api/auth.api';
import { apiError, emailField } from './shared';

const schema = z.object({ email: emailField });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  usePageMeta('Forgot password', undefined, '/forgot-password');
  const [sentTo, setSentTo] = useState('');
  const [devLink, setDevLink] = useState('');
  const [formError, setFormError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: Values) => {
    setFormError('');
    try {
      const data = await forgotPassword(email);
      setSentTo(email);
      if (data.resetLink) setDevLink(data.resetLink);
    } catch (err) {
      setFormError(apiError(err));
    }
  };

  if (sentTo) {
    return (
      <AuthPageFrame title="Check your email">
        <div role="status" className="flex items-start gap-3 rounded-card bg-success-soft p-4 text-sm text-success-ink">
          <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>If an account exists for {sentTo}, a reset link is on its way.</p>
        </div>
        {devLink && (
          <p className="mt-4 break-all rounded-control bg-surface-sunken p-3 text-sm text-ink-muted">
            Dev link: <a href={devLink} className="text-accent-ink underline">{devLink}</a>
          </p>
        )}
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-accent-ink hover:underline">Back to log in</Link>
      </AuthPageFrame>
    );
  }

  return (
    <AuthPageFrame title="Forgot password" subtitle="Enter your email and we will send you a link to set a new password.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">{formError}</p>
        )}
        <Field label="Email" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Sending' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-muted">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-accent-ink hover:underline">Log in</Link>
      </p>
    </AuthPageFrame>
  );
}
