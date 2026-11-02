import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail } from 'lucide-react';
import { LockKeyhole } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';
import AuthSplitLayout from '../../components/AuthSplitLayout';
import AuthRoleTabs from './AuthRoleTabs';
import PasswordInput from './PasswordInput';
import { Banner, Field, FormFooter, SubmitButton } from './formParts';
import { a11y, errorInput, footerLink } from './authForm';
import { ROUTES, dashboardFor, loginPageFor } from '../../utils/routes';
import type { LoginRole } from '../../utils/routes';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface RoleLoginFormProps {
  role: 'member' | 'trainer' | 'owner' | 'admin';
  allowedRoles: LoginRole[];
  /** Who this page is for, used in the wrong-role message, e.g. "gym owner". */
  audience: string;
  title: string;
  subtitle: string;
  registerTo?: string;
  registerLabel?: string;
}

const RoleLoginForm = ({ role, allowedRoles, audience, title, subtitle, registerTo, registerLabel = 'Create an account' }: RoleLoginFormProps) => {
  const [error, setError] = useState('');
  const [wrongRoleLink, setWrongRoleLink] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { rememberMe: true } });

  const redirect = new URLSearchParams(location.search).get('redirect');
  const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : null;

  if (user && !isSubmitting) return <Navigate to={safeRedirect ?? dashboardFor(user.role)} replace />;

  const onSubmit = async (data: LoginFormValues) => {
    setError('');
    setWrongRoleLink('');
    try {
      const { user, token } = (await api.post('/auth/login', data)).data;

      if (!allowedRoles.includes(user.role)) {
        // Login already set the refresh cookie on the server; revoke it so no session is left behind.
        await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        setError(`This sign-in is for ${audience} accounts. Your account uses a different one.`);
        if (user.role !== 'SUPER_ADMIN') setWrongRoleLink(loginPageFor(user.role));
        return;
      }

      setAuth(user, token);
      navigate(safeRedirect ?? dashboardFor(user.role), { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not sign you in. Please try again.');
    }
  };

  return (
    <AuthSplitLayout
      role={role}
      title={title}
      subtitle={subtitle}
      top={role === 'admin' ? undefined : <AuthRoleTabs active={role} mode="login" />}
    >
      {error && (
        <Banner>
          {error}
          {wrongRoleLink && (
            <>
              {' '}
              <Link to={wrongRoleLink} className="font-bold underline">Go to the right sign-in</Link>
            </>
          )}
        </Banner>
      )}

      <div className="mb-5 flex items-center gap-2 text-xs font-medium text-[var(--color-muted)]">
        <LockKeyhole className="h-4 w-4 text-[var(--color-secondary)]" aria-hidden="true" />
        Sign in to your {audience} account
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field id="email" label="Email address" error={errors.email}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              {...a11y('email', errors.email)}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              {...register('email')}
              className={`input-field pl-10 ${errors.email ? errorInput : ''}`}
              placeholder="you@example.com"
            />
          </div>
        </Field>

        <Field id="password" label="Password" error={errors.password}>
          <PasswordInput
            {...a11y('password', errors.password)}
            autoComplete="current-password"
            {...register('password')}
            className={errors.password ? errorInput : ''}
            placeholder="Your password"
          />
        </Field>

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-[var(--color-charcoal)]">
            <input type="checkbox" {...register('rememberMe')} className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]" />
            Remember me
          </label>
          {role !== 'admin' && (
            <Link to={ROUTES.forgotPassword} className={footerLink}>
              Forgot password?
            </Link>
          )}
        </div>

        <SubmitButton busy={isSubmitting} busyLabel="Signing in...">Log in</SubmitButton>
      </form>

      {registerTo && (
        <FormFooter>
          New to Kavach Fitness? <Link to={registerTo} className={footerLink}>{registerLabel}</Link>
        </FormFooter>
      )}
    </AuthSplitLayout>
  );
};

export default RoleLoginForm;
