import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AuthPageFrame } from '../../layouts/AuthLayout';
import { Button, Field, PasswordInput } from '../../components/ui';
import { activateAccount } from '../../api/auth.api';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { homeForRole } from '../../utils/roleHome';
import { PASSWORD_HINT, apiError, passwordField } from './shared';

const schema = z
  .object({ password: passwordField, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type Values = z.infer<typeof schema>;

export default function ActivateAccountPage() {
  usePageMeta('Activate your account', undefined, '/activate');
  const token = useSearchParams()[0].get('token') ?? '';
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ password }: Values) => {
    setFormError('');
    try {
      const data = await activateAccount(token, password);
      setAuth(data.user, data.token);
      addNotification('success', 'Your account is active.');
      navigate(homeForRole(data.user.role), { replace: true });
    } catch (err) {
      setFormError(apiError(err, 'This activation link is invalid or has expired.'));
    }
  };

  if (!token) {
    return (
      <AuthPageFrame title="Activation link not valid" subtitle="This link is missing its token. Ask your gym to send a new invite.">
        <Button to="/login" variant="secondary" size="lg" className="w-full">Go to log in</Button>
      </AuthPageFrame>
    );
  }

  return (
    <AuthPageFrame title="Activate your account" subtitle="Set a password to finish setting up your account.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">{formError}</p>
        )}
        <Field label="Password" required hint={PASSWORD_HINT} error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label="Confirm password" required error={errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Activating' : 'Activate account'}
        </Button>
      </form>
    </AuthPageFrame>
  );
}
