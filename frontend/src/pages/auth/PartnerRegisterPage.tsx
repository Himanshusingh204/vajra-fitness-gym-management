import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AuthPageFrame } from '../../layouts/AuthLayout';
import { Button, Field, Input, PasswordInput } from '../../components/ui';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';
import { PASSWORD_HINT, apiError, emailField, nameField, optionalPhoneField, passwordField } from './shared';

const schema = z.object({
  username: nameField,
  email: emailField,
  phone: optionalPhoneField,
  password: passwordField,
  gymName: z.string().trim().min(2, 'Enter at least 2 characters').max(120, 'Keep it under 120 characters'),
  address: z.string().trim().min(3, 'Enter the gym address').max(300, 'Keep it under 300 characters'),
  city: z.string().trim().min(2, 'Enter the city').max(80),
  state: z.string().trim().min(2, 'Enter the state').max(80),
  pincode: z.string().refine((v) => v === '' || /^[1-9]\d{5}$/.test(v), 'Pincode must be 6 digits'),
  gstNumber: z.string().trim().refine(
    (v) => v === '' || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(v),
    'Enter a valid 15-character GSTIN',
  ),
});

type Values = z.infer<typeof schema>;

export default function PartnerRegisterPage() {
  usePageMeta('Register your gym', 'Start a free trial of Vajra Fitness for your gym.', '/register/partner');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', pincode: '', gstNumber: '' },
  });

  const onSubmit = async (v: Values) => {
    setFormError('');
    try {
      const { data } = await api.post('/auth/register/vendor', {
        ...v,
        phone: v.phone.trim(),
        pincode: v.pincode || null,
        gstNumber: v.gstNumber.toUpperCase(),
      });
      setAuth(data.user, data.token);
      navigate('/admin/gym', { replace: true });
    } catch (err) {
      setFormError(apiError(err, 'Could not create your account.'));
    }
  };

  return (
    <AuthPageFrame title="Register your gym" subtitle="Start with a 14-day free trial. No card needed." image="partner">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">{formError}</p>
        )}
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-1 text-sm font-semibold text-ink-muted">Your account</legend>
          <Field label="Full name" required error={errors.username?.message}>
            <Input autoComplete="name" {...register('username')} />
          </Field>
          <Field label="Email" required error={errors.email?.message}>
            <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
          </Field>
          <Field label="Mobile number" error={errors.phone?.message}>
            <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="+91" {...register('phone')} />
          </Field>
          <Field label="Password" required hint={PASSWORD_HINT} error={errors.password?.message}>
            <PasswordInput autoComplete="new-password" {...register('password')} />
          </Field>
        </fieldset>
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-1 text-sm font-semibold text-ink-muted">Your gym</legend>
          <Field label="Gym name" required error={errors.gymName?.message}>
            <Input autoComplete="organization" {...register('gymName')} />
          </Field>
          <Field label="Address" required error={errors.address?.message}>
            <Input autoComplete="street-address" {...register('address')} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="City" required error={errors.city?.message}>
              <Input autoComplete="address-level2" {...register('city')} />
            </Field>
            <Field label="State" required error={errors.state?.message}>
              <Input autoComplete="address-level1" {...register('state')} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Pincode" error={errors.pincode?.message}>
              <Input inputMode="numeric" autoComplete="postal-code" maxLength={6} {...register('pincode')} />
            </Field>
            <Field label="GSTIN" hint="Optional." error={errors.gstNumber?.message}>
              <Input autoCapitalize="characters" maxLength={15} {...register('gstNumber')} />
            </Field>
          </div>
        </fieldset>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Creating account' : 'Start free trial'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent-ink hover:underline">Log in</Link>
      </p>
    </AuthPageFrame>
  );
}
