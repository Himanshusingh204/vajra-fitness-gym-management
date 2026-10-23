import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AuthPageFrame } from '../../layouts/AuthLayout';
import { Button, Field, Input, PasswordInput } from '../../components/ui';
import { useAuthStore } from '../../store/useAuthStore';
import { getMe } from '../../api/auth.api';
import { homeForRole } from '../../utils/roleHome';
import api from '../../services/api';
import { apiError, emailField, safeRedirect } from './shared';

const schema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password'),
});

type Values = z.infer<typeof schema>;

export default function LoginPage() {
  usePageMeta('Log in', 'Log in to your Vajra Fitness account.', '/login');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  if (user && !isSubmitting) return <Navigate to={redirect ?? homeForRole(user.role)} replace />;

  const onSubmit = async (values: Values) => {
    setFormError('');
    try {
      const { data } = await api.post('/auth/login', values);
      let account = data.user;
      if (account.role === 'TRAINER') {
        // The login response has no approval state, and the trainer screens need it.
        setAuth(account, data.token);
        account = await getMe().catch(() => account);
      }
      setAuth(account, data.token);
      navigate(redirect ?? homeForRole(account.role), { replace: true });
    } catch (err) {
      setFormError(apiError(err, 'Wrong email or password.'));
    }
  };

  return (
    <AuthPageFrame title="Log in" subtitle="Welcome back. Enter your details to continue.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">
            {formError}
          </p>
        )}
        <Field label="Email" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field label="Password" required error={errors.password?.message}>
          <PasswordInput autoComplete="current-password" {...register('password')} />
        </Field>
        <div className="-mt-2 text-right">
          <Link to="/forgot-password" className="text-sm font-semibold text-accent-ink hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Logging in' : 'Log in'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-muted">
        New to Vajra Fitness?{' '}
        <Link to="/register" className="font-semibold text-accent-ink hover:underline">Create an account</Link>
      </p>
    </AuthPageFrame>
  );
}
