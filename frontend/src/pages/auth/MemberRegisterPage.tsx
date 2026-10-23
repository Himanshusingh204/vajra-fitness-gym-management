import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import * as z from 'zod';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AuthPageFrame } from '../../layouts/AuthLayout';
import { Button, Checkbox, Field, Input, PasswordInput, Select, cx } from '../../components/ui';
import { enrollMember, getPublicGyms } from '../../api/gym.api';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDuration, formatPrice } from '../../utils/format';
import api from '../../services/api';
import { PASSWORD_HINT, apiError, emailField, nameField, optionalPhoneField, passwordField, safeRedirect } from './shared';

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Pay at the gym', hint: 'Cash at the front desk after approval.' },
  { id: 'UPI', label: 'UPI', hint: 'Pay online.' },
  { id: 'CARD', label: 'Card', hint: 'Pay online.' },
];

const schema = z.object({
  username: z.string(),
  email: z.string(),
  phone: z.string(),
  password: z.string(),
  gymId: z.string(),
  planId: z.string(),
  later: z.boolean(),
  paymentMethod: z.string(),
});

type Values = z.infer<typeof schema>;

// The account fields are skipped for a signed-in member who is only joining another gym.
const accountSchema = z.object({
  username: nameField,
  email: emailField,
  phone: optionalPhoneField,
  password: passwordField,
});

export default function MemberRegisterPage() {
  usePageMeta('Member sign-up', 'Create a Vajra Fitness member account and join your gym.', '/register/member');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const joiningAsMember = user?.role === 'MEMBER';
  const [formError, setFormError] = useState('');

  const { data: gyms = [], isLoading: gymsLoading } = useQuery({
    queryKey: ['public-gyms'],
    queryFn: getPublicGyms,
    staleTime: 60_000,
  });

  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '', email: '', phone: '', password: '',
      gymId: params.get('gym') ?? '', planId: '', later: false, paymentMethod: 'UPI',
    },
  });

  const gymId = watch('gymId');
  const planId = watch('planId');
  const later = watch('later');
  const gym = gyms.find((g) => g.id === gymId);

  const onSubmit = async (v: Values) => {
    setFormError('');
    if (!v.later || joiningAsMember) {
      if (!gym) return setError('gymId', { message: 'Choose a gym' });
      if (!v.planId) return setError('planId', { message: 'Choose a plan' });
    }

    try {
      if (joiningAsMember) {
        await enrollMember(v.gymId, v.planId, v.paymentMethod);
        navigate('/dashboard', { replace: true });
        return;
      }

      const account = accountSchema.safeParse(v);
      if (!account.success) {
        for (const issue of account.error.issues) {
          setError(issue.path[0] as keyof Values, { message: issue.message });
        }
        return;
      }

      const { data } = await api.post('/auth/register/member', {
        ...account.data,
        phone: account.data.phone.trim(),
        ...(v.later ? {} : { gymId: v.gymId, planId: v.planId, preferredPaymentMethod: v.paymentMethod }),
      });
      setAuth(data.user, data.token);
      navigate(safeRedirect(params.get('redirect')) ?? '/dashboard', { replace: true });
    } catch (err) {
      setFormError(apiError(err, 'Could not complete sign-up.'));
    }
  };

  return (
    <AuthPageFrame
      title={joiningAsMember ? 'Join another gym' : 'Member sign-up'}
      subtitle={joiningAsMember ? `Signed in as ${user.email}.` : 'Pick your gym and plan, then set up your account.'}
      image="member"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">{formError}</p>
        )}

        <Field label="Gym" required={!later} error={errors.gymId?.message}>
          <Select
            disabled={later || gymsLoading}
            {...register('gymId', { onChange: () => setValue('planId', '') })}
          >
            <option value="">{gymsLoading ? 'Loading gyms' : 'Select a gym'}</option>
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>{g.name}, {g.city}</option>
            ))}
          </Select>
        </Field>

        {!joiningAsMember && (
          <Checkbox
            label="I will pick a gym later"
            hint="You can join one from your dashboard."
            {...register('later', { onChange: (e) => e.target.checked && setValue('gymId', '') })}
          />
        )}

        {gym && !later && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-ink">Membership plan</legend>
            {gym.membershipPlans.length === 0 && (
              <p className="text-sm text-ink-muted">This gym has not published any plans yet.</p>
            )}
            {gym.membershipPlans.map((plan) => (
              <label
                key={plan.id}
                className={cx(
                  'flex min-h-11 cursor-pointer items-start gap-3 rounded-control border p-3.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                  planId === plan.id ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:bg-surface-sunken',
                )}
              >
                <input type="radio" value={plan.id} className="mt-1 size-4 accent-accent" {...register('planId')} />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-3 font-semibold text-ink">
                    {plan.name}
                    <span>{formatPrice(plan.price)}</span>
                  </span>
                  <span className="block text-sm text-ink-muted">
                    {formatDuration(plan.duration)}{plan.description ? `. ${plan.description}` : ''}
                  </span>
                </span>
              </label>
            ))}
            {errors.planId && <p className="text-sm font-medium text-danger-ink">{errors.planId.message}</p>}
          </fieldset>
        )}

        {!joiningAsMember && (
          <>
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
          </>
        )}

        {!later && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-ink">How will you pay?</legend>
            {PAYMENT_METHODS.map((m) => (
              <label key={m.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
                <input type="radio" value={m.id} className="size-4 accent-accent" {...register('paymentMethod')} />
                <span>
                  {m.label}
                  <span className="text-ink-muted">. {m.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting || gymsLoading}>
          {isSubmitting ? 'Submitting' : joiningAsMember ? 'Request membership' : later ? 'Create account' : 'Create account and request membership'}
        </Button>
      </form>
      {!joiningAsMember && (
        <p className="mt-6 text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-ink hover:underline">Log in</Link>
        </p>
      )}
    </AuthPageFrame>
  );
}
