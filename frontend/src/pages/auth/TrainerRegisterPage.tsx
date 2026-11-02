import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { getPublicGyms } from '../../api/gym.api';
import { usePageMeta } from '../../hooks/usePageMeta';
import AuthSplitLayout from '../../components/AuthSplitLayout';
import AuthRoleTabs from './AuthRoleTabs';
import RegistrationProgress from './RegistrationProgress';
import { AccountFields, TermsField } from './AccountFields';
import { Banner, Field, FormFooter, SubmitButton } from './formParts';
import { a11y, accountFields, applyServerFieldIssues, errorInput, focusFirstError, footerLink, mismatch, passwordsMatch } from './authForm';
import { ROUTES } from '../../utils/routes';

const SPECIALIZATIONS = ['Strength training', 'Weight loss', 'Bodybuilding', 'CrossFit', 'Yoga', 'Pilates', 'Cardio and HIIT', 'Sports conditioning', 'Nutrition', 'Rehab and mobility'];

const schema = accountFields
  .extend({
    gymId: z.string().min(1, 'Choose the gym you want to coach at'),
    specialization: z.string().min(1, 'Choose your main specialization'),
  })
  .refine(passwordsMatch, mismatch);
type FormValues = z.input<typeof schema>;

const TrainerRegisterPage = () => {
  usePageMeta('Trainer sign up', 'Apply to join a gym as a trainer on Kavach Fitness.', ROUTES.trainerRegister);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [error, setError] = useState('');

  const { data: gyms = [], isLoading: gymsLoading } = useQuery({
    queryKey: ['public-gyms'],
    queryFn: getPublicGyms,
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { gymId: searchParams.get('gym') || '', specialization: '', terms: false },
    shouldFocusError: false,
  });

  const onSubmit = async ({ username, email, phone, password, gymId, specialization }: z.output<typeof schema>) => {
    setError('');
    try {
      const { token, user, message } = (await api.post('/auth/register/trainer', { username, email, phone, password, gymId, specialization })).data;
      setAuth(user, token);
      addNotification('success', message || 'Application sent. The gym will review it soon.');
      navigate('/trainer', { replace: true });
    } catch (err: any) {
      const issues: Array<{ path?: string; message?: string }> = err.response?.data?.issues ?? [];
      const mapped = applyServerFieldIssues(issues, { username: 'reg-name', email: 'reg-email', phone: 'reg-phone', password: 'reg-password', gymId: 'trainer-gym', specialization: 'trainer-specialization' }, setFieldError);
      if (!mapped) setError(issues[0]?.message || err.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <AuthSplitLayout
      role="trainer"
      title="Apply as a trainer"
      subtitle="The gym owner reviews your application before you get access."
      top={<><RegistrationProgress current={2} /><AuthRoleTabs active="trainer" mode="register" /></>}
      wide
    >
      {error && <Banner>{error}</Banner>}

      <form onSubmit={handleSubmit(onSubmit, focusFirstError)} className="space-y-5" noValidate>
        <section aria-labelledby="trainer-account-heading">
          <h2 id="trainer-account-heading" className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">Your account</h2>
          <AccountFields register={register} errors={errors} />
        </section>
        <section aria-labelledby="trainer-profile-heading">
          <h2 id="trainer-profile-heading" className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">Your coaching profile</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="trainer-gym" label="Gym" error={errors.gymId}>
            {/* Mounted after the list loads so a ?gym= preselection finds its option. */}
            {gymsLoading ? (
              <select id="trainer-gym" disabled className="input-field"><option>Loading gyms...</option></select>
            ) : (
              <select {...a11y('trainer-gym', errors.gymId)} {...register('gymId')} className={`input-field ${errors.gymId ? errorInput : ''}`}>
                <option value="">Choose a gym</option>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}, {g.city}</option>
                ))}
              </select>
            )}
          </Field>
          <Field id="trainer-specialization" label="Specialization" error={errors.specialization}>
            <select {...a11y('trainer-specialization', errors.specialization)} {...register('specialization')} className={`input-field ${errors.specialization ? errorInput : ''}`}>
              <option value="">Choose one</option>
              {SPECIALIZATIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        </section>
        <TermsField register={register} errors={errors} />
        <SubmitButton busy={isSubmitting} busyLabel="Sending application...">Send application</SubmitButton>
      </form>

      <FormFooter>
        Already have an account? <Link to={ROUTES.trainerLogin} className={footerLink}>Log in</Link>
      </FormFooter>
    </AuthSplitLayout>
  );
};

export default TrainerRegisterPage;
