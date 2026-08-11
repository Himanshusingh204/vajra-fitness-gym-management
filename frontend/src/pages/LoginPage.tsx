import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LogIn, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { Reveal } from '../components/Reveal';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError('');

      const response = await api.post('/auth/login', data);

      setAuth(response.data.user, response.data.token);

      // Honor a safe same-site redirect (e.g. /subscription after login).
      const redirect = new URLSearchParams(location.search).get('redirect');
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        navigate(redirect);
        return;
      }

      const role = response.data.user.role;
      if (role === 'SUPER_ADMIN') navigate('/admin/super');
      else if (role === 'GYM_ADMIN') navigate('/admin/gym');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials or server error.');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center relative overflow-hidden bg-[var(--color-base)] dark:bg-[var(--color-base)]">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-full max-h-[600px] bg-[var(--color-primary)]/20 dark:bg-[var(--color-primary)]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-[var(--color-accent)]/10 rounded-full blur-3xl animate-blob pointer-events-none" />
      <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-[var(--color-secondary)]/10 rounded-full blur-3xl animate-blob [animation-delay:-8s] pointer-events-none" />

      <div className="w-full max-w-md px-4 relative z-10">
        <Reveal variant="scale">
          <div className="glass-strong rounded-3xl p-8 sm:p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <LogIn className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-2">Welcome Back</h1>
              <p className="text-[var(--color-muted)]">Enter your credentials to access your dashboard.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-[var(--color-charcoal)] mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`input-field ${errors.email ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-[var(--color-charcoal)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    className={`input-field pr-12 ${errors.password ? 'border-red-500! focus:ring-red-500/20!' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-muted)] hover:text-[var(--color-charcoal)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.password.message}</p>}
                <div className="mt-1.5 text-right">
                  <Link to="/forgot-password" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary"
                >
                  {isSubmitting ? 'Authenticating...' : (
                    <>Sign In <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center border-t border-[var(--color-border)] pt-6 space-y-3">
              <p className="text-sm text-[var(--color-muted)] font-medium">
                New here?{' '}
                <Link to="/register/member" className="text-[var(--color-primary)] font-bold hover:underline">
                  Join a gym & create a member account
                </Link>
              </p>
              <p className="text-sm text-[var(--color-muted)] font-medium">
                Own a gym?{' '}
                <Link to="/register" className="text-[var(--color-primary)] font-bold hover:underline">
                  Register your gym here
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default LoginPage;
