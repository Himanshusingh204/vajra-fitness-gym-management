import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail } from 'lucide-react';
import { forgotPassword } from '../api/auth.api';
import { usePageMeta } from '../hooks/usePageMeta';
import AuthSplitLayout from '../components/AuthSplitLayout';
import { Banner, Field, FormFooter, SubmitButton } from './auth/formParts';
import { a11y, errorInput, footerLink } from './auth/authForm';
import { ROUTES } from '../utils/routes';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address') });
type FormValues = z.infer<typeof schema>;

const ForgotPasswordPage = () => {
  usePageMeta('Forgot password', undefined, ROUTES.forgotPassword);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      const response = await forgotPassword(data.email);
      setSent(true);
      if (response.resetLink) setDevLink(response.resetLink);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not send the reset link. Please try again.');
    }
  };

  return (
    <AuthSplitLayout role="member" eyebrow="Account" title="Forgot your password?" subtitle="Enter your account email and we'll send you a reset link.">
      {sent ? (
        <>
          <Banner tone="success">If an account exists for that email, a reset link is on its way.</Banner>
          {devLink && (
            <p className="break-all text-xs text-[var(--color-muted)]">
              Development link: <a href={devLink} className={footerLink}>{devLink}</a>
            </p>
          )}
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {error && <Banner>{error}</Banner>}
          <Field id="email" label="Email address" error={errors.email}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
              <input {...a11y('email', errors.email)} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} {...register('email')} className={`input-field pl-10 ${errors.email ? errorInput : ''}`} placeholder="you@example.com" />
            </div>
          </Field>
          <SubmitButton busy={isSubmitting} busyLabel="Sending...">Send reset link</SubmitButton>
        </form>
      )}
      <FormFooter>
        Remembered it? <Link to={ROUTES.login} className={footerLink}>Log in</Link>
      </FormFooter>
    </AuthSplitLayout>
  );
};

export default ForgotPasswordPage;
