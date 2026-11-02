import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { usePageMeta } from '../hooks/usePageMeta';
import AuthSplitLayout from '../components/AuthSplitLayout';
import AuthRoleTabs from './auth/AuthRoleTabs';
import RegistrationProgress from './auth/RegistrationProgress';
import { AccountFields, TermsField } from './auth/AccountFields';
import { Banner, Field, FormFooter, SubmitButton } from './auth/formParts';
import { a11y, accountFields, errorInput, focusFirstError, footerLink, mismatch, passwordsMatch } from './auth/authForm';
import { ROUTES } from '../utils/routes';

const stripUnsafeText = (value: string) => value.replace(/<[^>]*>/g, '').split('').filter((char) => {
  const code = char.charCodeAt(0);
  return (code >= 32 || code === 9 || code === 10 || code === 13) && code !== 127;
}).join('').trim();

const text = (min: number, max: number, message: string) => z.string().trim()
  .transform(stripUnsafeText)
  .pipe(z.string().min(min, message).max(max, `Keep it under ${max} characters`));

const schema = accountFields
  .extend({
    gymName: text(2, 120, 'Enter your gym name'),
    city: text(2, 80, 'Enter the city'),
    state: text(2, 80, 'Enter the state'),
    address: text(3, 300, 'Enter the street address'),
  })
  .refine(passwordsMatch, mismatch);
type FormValues = z.input<typeof schema>;

const VendorRegisterPage = () => {
  usePageMeta('Register your gym', 'List your gym on Kavach Fitness.', ROUTES.partnerRegister);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { terms: false }, shouldFocusError: false });

  const onSubmit = async ({ username, email, phone, password, gymName, city, state, address }: z.output<typeof schema>) => {
    setFormError('');
    try {
      const { token, user, message } = (await api.post('/auth/register/vendor', { username, email, phone, password, gymName, city, state, address })).data;
      setAuth(user, token);
      addNotification('success', message || 'Gym registered. We will review it shortly.');
      navigate('/owner', { replace: true });
    } catch (err: any) {
      const issues: Array<{ path?: string; message?: string }> = err.response?.data?.issues ?? [];
      let focusedField: string | undefined;
      for (const issue of issues) {
        const field = issue.path?.split('.')[0];
        if (field && ['username', 'email', 'phone', 'password', 'gymName', 'city', 'state', 'address'].includes(field)) {
          setFieldError(field as keyof FormValues, { type: 'server', message: issue.message || 'Please check this field' });
          focusedField ??= ({ username: 'reg-name', email: 'reg-email', phone: 'reg-phone', password: 'reg-password', gymName: 'owner-gym', city: 'owner-city', state: 'owner-state', address: 'owner-address' } as Record<string, string>)[field];
        } else if (issue.message) {
          setFormError(issue.message);
        }
      }
      if (focusedField) requestAnimationFrame(() => document.getElementById(focusedField!)?.focus());
      if (!focusedField && issues.length === 0) setFormError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  const input = (name: 'gymName' | 'city' | 'state' | 'address', id: string, autoComplete: string, placeholder: string) => (
    <input {...a11y(id, errors[name])} autoComplete={autoComplete} {...register(name)} className={`input-field ${errors[name] ? errorInput : ''}`} placeholder={placeholder} />
  );

  return (
    <AuthSplitLayout
      role="owner"
      title="Register your gym"
      subtitle="Your gym goes live once our team approves it."
      top={<><RegistrationProgress current={2} /><AuthRoleTabs active="owner" mode="register" /></>}
      wide
    >
      {formError && <Banner>{formError}</Banner>}
      {Object.keys(errors).length > 0 && <Banner>Some details need attention. Review the highlighted fields and try again.</Banner>}

      <form onSubmit={handleSubmit(onSubmit, focusFirstError)} className="space-y-5" noValidate>
        <section aria-labelledby="owner-account-heading">
          <h2 id="owner-account-heading" className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">Your account</h2>
          <AccountFields register={register} errors={errors} />
        </section>
        <section aria-labelledby="owner-gym-heading" className="space-y-5">
          <h2 id="owner-gym-heading" className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">Tell us about your gym</h2>

        <Field id="owner-gym" label="Gym name" error={errors.gymName}>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input {...a11y('owner-gym', errors.gymName)} autoComplete="organization" {...register('gymName')} className={`input-field pl-10 ${errors.gymName ? errorInput : ''}`} placeholder="Iron House Fitness" />
          </div>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="owner-city" label="City" error={errors.city}>
            {input('city', 'owner-city', 'address-level2', 'Jaipur')}
          </Field>
          <Field id="owner-state" label="State" error={errors.state}>
            {input('state', 'owner-state', 'address-level1', 'Rajasthan')}
          </Field>
        </div>
        <Field id="owner-address" label="Street address" error={errors.address}>
          {input('address', 'owner-address', 'street-address', 'Building, street, landmark')}
        </Field>
        </section>

        <TermsField register={register} errors={errors} />
        <SubmitButton busy={isSubmitting} busyLabel="Registering...">Register gym</SubmitButton>
      </form>

      <FormFooter>
        Already have an account? <Link to={ROUTES.partnerLogin} className={footerLink}>Log in</Link>
      </FormFooter>
    </AuthSplitLayout>
  );
};

export default VendorRegisterPage;
