import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { acceptTrainerInvite } from '../api/auth.api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { usePageMeta } from '../hooks/usePageMeta';
import AuthSplitLayout from '../components/AuthSplitLayout';
import PasswordInput from './auth/PasswordInput';
import { Banner, Field, SubmitButton } from './auth/formParts';
import { a11y, accountFields, errorInput, mismatch, passwordsMatch } from './auth/authForm';
import { dashboardFor } from '../utils/routes';

const schema = z
  .object({ username: accountFields.shape.username, password: accountFields.shape.password, confirmPassword: z.string() })
  .refine(passwordsMatch, mismatch);
type FormValues = z.infer<typeof schema>;

const AcceptInvitePage = () => {
  usePageMeta('Accept invitation', undefined, '/accept-invite');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      const response = await acceptTrainerInvite(token, data.username, data.password);
      setAuth(response.user, response.token);
      addNotification('success', response.message || 'Welcome to the team.');
      navigate(dashboardFor(response.user.role), { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not accept this invitation.');
    }
  };

  return (
    <AuthSplitLayout
      role="trainer"
      eyebrow="Invitation"
      title="Join as a trainer"
      subtitle={token ? 'Tell us your name and choose a password to get started.' : 'This invitation link is missing or has expired. Ask the gym for a new one.'}
    >
      {token && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {error && <Banner>{error}</Banner>}
          <Field id="invite-name" label="Full name" error={errors.username}>
            <input {...a11y('invite-name', errors.username)} autoComplete="name" {...register('username')} className={`input-field ${errors.username ? errorInput : ''}`} />
          </Field>
          <Field id="password" label="Password" error={errors.password}>
            <PasswordInput {...a11y('password', errors.password)} autoComplete="new-password" {...register('password')} className={errors.password ? errorInput : ''} placeholder="8+ characters" />
          </Field>
          <Field id="confirm-password" label="Confirm password" error={errors.confirmPassword}>
            <PasswordInput {...a11y('confirm-password', errors.confirmPassword)} autoComplete="new-password" {...register('confirmPassword')} className={errors.confirmPassword ? errorInput : ''} />
          </Field>
          <SubmitButton busy={isSubmitting} busyLabel="Joining...">Accept invitation</SubmitButton>
        </form>
      )}
    </AuthSplitLayout>
  );
};

export default AcceptInvitePage;
