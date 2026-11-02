import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { resetPassword } from '../api/auth.api';
import { useNotificationStore } from '../store/useNotificationStore';
import { usePageMeta } from '../hooks/usePageMeta';
import AuthSplitLayout from '../components/AuthSplitLayout';
import PasswordInput from './auth/PasswordInput';
import { Banner, Field, FormFooter, SubmitButton } from './auth/formParts';
import { a11y, accountFields, errorInput, footerLink, mismatch, passwordsMatch } from './auth/authForm';
import { ROUTES } from '../utils/routes';

const schema = z
  .object({ password: accountFields.shape.password, confirmPassword: z.string() })
  .refine(passwordsMatch, mismatch);
type FormValues = z.infer<typeof schema>;

const ResetPasswordPage = () => {
  usePageMeta('Reset password', undefined, '/reset-password');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      await resetPassword(token, data.password);
      addNotification('success', 'Password updated. Log in with your new password.');
      navigate(ROUTES.login, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not reset your password.');
    }
  };

  return (
    <AuthSplitLayout
      role="member"
      eyebrow="Account"
      title="Set a new password"
      subtitle={token ? 'Use at least 8 characters with a letter and a number.' : 'This reset link is missing or has expired.'}
    >
      {!token ? (
        <Link to={ROUTES.forgotPassword} className="btn-primary w-full py-3">Request a new link</Link>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {error && <Banner>{error}</Banner>}
          <Field id="new-password" label="New password" error={errors.password}>
            <PasswordInput {...a11y('new-password', errors.password)} autoComplete="new-password" {...register('password')} className={errors.password ? errorInput : ''} />
          </Field>
          <Field id="confirm-password" label="Confirm password" error={errors.confirmPassword}>
            <PasswordInput {...a11y('confirm-password', errors.confirmPassword)} autoComplete="new-password" {...register('confirmPassword')} className={errors.confirmPassword ? errorInput : ''} />
          </Field>
          <SubmitButton busy={isSubmitting} busyLabel="Updating...">Update password</SubmitButton>
        </form>
      )}
      <FormFooter>
        Remembered it? <Link to={ROUTES.login} className={footerLink}>Log in</Link>
      </FormFooter>
    </AuthSplitLayout>
  );
};

export default ResetPasswordPage;
