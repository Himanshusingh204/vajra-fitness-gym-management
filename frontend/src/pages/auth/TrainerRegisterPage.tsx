import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import * as z from 'zod';
import { Clock } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AuthPageFrame } from '../../layouts/AuthLayout';
import { Button, Field, Input, PasswordInput, Select, Textarea } from '../../components/ui';
import { getPublicGyms } from '../../api/gym.api';
import api from '../../services/api';
import { PASSWORD_HINT, apiError, emailField, nameField, passwordField, phoneField } from './shared';

const schema = z.object({
  username: nameField,
  email: emailField,
  phone: phoneField,
  password: passwordField,
  gymId: z.string().min(1, 'Choose the gym you work at'),
  specialization: z.string().trim().max(80, 'Keep it under 80 characters'),
  experienceYears: z.string().refine((v) => v === '' || (/^\d{1,2}$/.test(v) && Number(v) <= 60), 'Enter a number from 0 to 60'),
  city: z.string().trim().max(80, 'Keep it under 80 characters'),
  bio: z.string().trim().max(600, 'Keep it under 600 characters'),
});

type Values = z.infer<typeof schema>;

export default function TrainerRegisterPage() {
  usePageMeta('Trainer sign-up', 'Join a gym on Vajra Fitness as a trainer.', '/register/trainer');
  const [formError, setFormError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { data: gyms = [], isLoading: gymsLoading, isError: gymsFailed } = useQuery({
    queryKey: ['public-gyms'],
    queryFn: getPublicGyms,
    staleTime: 60_000,
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { gymId: '', specialization: '', experienceYears: '', city: '', bio: '' },
  });

  const onSubmit = async (v: Values) => {
    setFormError('');
    try {
      await api.post('/auth/register/trainer', {
        username: v.username,
        email: v.email,
        phone: v.phone,
        password: v.password,
        gymId: v.gymId,
        specialization: v.specialization || null,
        experienceYears: v.experienceYears === '' ? null : Number(v.experienceYears),
        city: v.city || null,
        bio: v.bio || null,
      });
      setSubmittedEmail(v.email);
    } catch (err) {
      setFormError(apiError(err, 'Could not create your account.'));
    }
  };

  if (submittedEmail) {
    return (
      <AuthPageFrame title="Waiting for approval" subtitle="Your request has gone to the gym admin." image="trainer">
        <div role="status" className="flex items-start gap-3 rounded-card bg-warning-soft p-4 text-sm text-warning-ink">
          <Clock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            Your account for {submittedEmail} is created, but you cannot use it until the gym admin approves you.
            You will get a notification once they decide.
          </p>
        </div>
        <Button to="/login" variant="secondary" size="lg" className="mt-6 w-full">Go to log in</Button>
      </AuthPageFrame>
    );
  }

  return (
    <AuthPageFrame title="Trainer sign-up" subtitle="Pick your gym. Its admin approves your account before you can log in." image="trainer">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">{formError}</p>
        )}
        <Field
          label="Gym"
          required
          error={errors.gymId?.message ?? (gymsFailed ? 'Could not load gyms. Refresh the page.' : undefined)}
        >
          <Select disabled={gymsLoading} {...register('gymId')}>
            <option value="">{gymsLoading ? 'Loading gyms' : 'Select your gym'}</option>
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>{g.name}, {g.city}</option>
            ))}
          </Select>
        </Field>
        <Field label="Full name" required error={errors.username?.message}>
          <Input autoComplete="name" {...register('username')} />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field label="Mobile number" required error={errors.phone?.message}>
          <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="+91" {...register('phone')} />
        </Field>
        <Field label="Password" required hint={PASSWORD_HINT} error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label="Specialization" error={errors.specialization?.message}>
          <Input placeholder="Strength, yoga, weight loss" {...register('specialization')} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Years of experience" error={errors.experienceYears?.message}>
            <Input inputMode="numeric" {...register('experienceYears')} />
          </Field>
          <Field label="City" error={errors.city?.message}>
            <Input autoComplete="address-level2" {...register('city')} />
          </Field>
        </div>
        <Field label="About you" hint="Optional. Shown to the gym admin." error={errors.bio?.message}>
          <Textarea {...register('bio')} />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Creating account' : 'Create trainer account'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent-ink hover:underline">Log in</Link>
      </p>
    </AuthPageFrame>
  );
}
