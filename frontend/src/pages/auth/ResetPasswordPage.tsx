import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AuthPageFrame } from '../../layouts/AuthLayout';
import { Button, Field, PasswordInput } from '../../components/ui';
import { resetPassword } from '../../api/auth.api';
import { useNotificationStore } from '../../store/useNotificationStore';
import { PASSWORD_HINT, apiError, passwordField } from './shared';

const schema = z
  .object({ newPassword: passwordField, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  usePageMeta('Set a new password', undefined, '/reset-password');
  const token = useSearchParams()[0].get('token') ?? '';
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ newPassword }: Values) => {
    setFormError('');
    try {
      await resetPassword(token, newPassword);
      addNotification('success', 'Password updated. Log in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(apiError(err, 'This reset link is invalid or has expired.'));
    }
  };

  if (!token) {
    return (
      <AuthPageFrame title="Reset link not valid" subtitle="This link is missing its token or has already been used.">
        <Button to="/forgot-password" size="lg" className="w-full">Request a new link</Button>
      </AuthPageFrame>
    );
  }

  return (
    <AuthPageFrame title="Set a new password" subtitle="Choose a password you have not used before.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">
            {formError}{' '}
            <Link to="/forgot-password" className="underline">Request a new link</Link>
          </p>
        )}
        <Field label="New password" required hint={PASSWORD_HINT} error={errors.newPassword?.message}>
          <PasswordInput autoComplete="new-password" {...register('newPassword')} />
        </Field>
        <Field label="Confirm new password" required error={errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Saving' : 'Update password'}
        </Button>
      </form>
    </AuthPageFrame>
  );
}
