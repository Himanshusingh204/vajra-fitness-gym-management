import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { activateAccount } from '../api/auth.api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { usePageMeta } from '../hooks/usePageMeta';
import AuthSplitLayout from '../components/AuthSplitLayout';
import PasswordInput from './auth/PasswordInput';
import { Banner, Field, SubmitButton } from './auth/formParts';
import { a11y, accountFields, errorInput, mismatch, passwordsMatch } from './auth/authForm';
import { dashboardFor } from '../utils/routes';

const schema = z
  .object({ password: accountFields.shape.password, confirmPassword: z.string() })
  .refine(passwordsMatch, mismatch);
type FormValues = z.infer<typeof schema>;

const ActivateAccountPage = () => {
  usePageMeta('Activate account', undefined, '/activate');
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
      const response = await activateAccount(token, data.password);
      setAuth(response.user, response.token);
      addNotification('success', 'Account activated. Welcome!');
      navigate(dashboardFor(response.user.role), { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not activate your account.');
    }
  };

  return (
    <AuthSplitLayout
      role="member"
      eyebrow="Account"
      title="Activate your account"
      subtitle={token ? 'Set a password to finish setting up your account.' : 'This activation link is missing or has expired. Ask your gym for a new invite.'}
    >
      {token && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {error && <Banner>{error}</Banner>}
          <Field id="password" label="Password" error={errors.password}>
            <PasswordInput {...a11y('password', errors.password)} autoComplete="new-password" {...register('password')} className={errors.password ? errorInput : ''} placeholder="8+ characters" />
          </Field>
          <Field id="confirm-password" label="Confirm password" error={errors.confirmPassword}>
            <PasswordInput {...a11y('confirm-password', errors.confirmPassword)} autoComplete="new-password" {...register('confirmPassword')} className={errors.confirmPassword ? errorInput : ''} />
          </Field>
          <SubmitButton busy={isSubmitting} busyLabel="Activating...">Activate account</SubmitButton>
        </form>
      )}
    </AuthSplitLayout>
  );
};

export default ActivateAccountPage;
