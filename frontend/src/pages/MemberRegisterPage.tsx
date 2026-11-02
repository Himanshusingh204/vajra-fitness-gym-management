import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type * as z from 'zod';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { getPublicGyms, enrollMember } from '../api/gym.api';
import { formatDuration, formatPrice } from '../utils/format';
import { usePageMeta } from '../hooks/usePageMeta';
import AuthSplitLayout from '../components/AuthSplitLayout';
import AuthRoleTabs from './auth/AuthRoleTabs';
import RegistrationProgress from './auth/RegistrationProgress';
import { AccountFields, TermsField } from './auth/AccountFields';
import { Banner, FormFooter, SubmitButton } from './auth/formParts';
import { accountFields, applyServerFieldIssues, footerLink, mismatch, passwordsMatch } from './auth/authForm';
import { ROUTES } from '../utils/routes';

const schema = accountFields.refine(passwordsMatch, mismatch);
type FormValues = z.input<typeof schema>;

const MemberRegisterPage = () => {
  usePageMeta('Join as a member', 'Create a Kavach Fitness member account.', ROUTES.memberRegister);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setAuth = useAuthStore((s) => s.setAuth);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const queryClient = useQueryClient();

  const { data: gyms = [], isLoading: gymsLoading } = useQuery({
    queryKey: ['public-gyms'],
    queryFn: getPublicGyms,
    staleTime: 60_000,
  });

  const [gymId, setGymId] = useState(searchParams.get('gym') || '');
  const [planId, setPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { terms: false } });

  const gym = useMemo(() => gyms.find((g) => g.id === gymId), [gyms, gymId]);
  const isLoggedInMember = user?.role === 'MEMBER';

  // A gym is optional at sign-up, but once one is picked it needs a plan.
  const gymProblem = () => {
    if (isLoggedInMember && !gymId) return 'Choose the gym you want to join.';
    if (gymId && !planId) return 'Choose a membership plan.';
    return '';
  };

  const createAccount = async (values: z.output<typeof schema>) => {
    setError('');
    const problem = gymProblem();
    if (problem) return setError(problem);
    try {
      const { username, email, phone, password } = values;
      const payload = gymId
        ? { username, email, phone, password, gymId, planId, preferredPaymentMethod: paymentMethod, referralCode: searchParams.get('ref') || undefined }
        : { username, email, phone, password };
      const { token, user: newUser, message } = (await api.post('/auth/register/member', payload)).data;
      setAuth(newUser, token);
      addNotification('success', message || 'Account created.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const issues: Array<{ path?: string; message?: string }> = err.response?.data?.issues ?? [];
      const mapped = applyServerFieldIssues(issues, { username: 'reg-name', email: 'reg-email', phone: 'reg-phone', password: 'reg-password' }, setFieldError);
      if (!mapped) setError(issues[0]?.message || err.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  const joinGym = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const problem = gymProblem();
    if (problem) return setError(problem);
    setEnrolling(true);
    try {
      const { message } = await enrollMember(gymId, planId, paymentMethod);
      // The new gym shows up in the dashboard's gym picker straight away.
      await queryClient.invalidateQueries({ queryKey: ['myGyms'] });
      addNotification('success', message || 'Membership request sent.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const gymPicker = (
    <div className="space-y-4 rounded-xl border border-[var(--color-border)] p-4">
      <div>
        <label htmlFor="member-gym" className="mb-1.5 block text-sm font-semibold text-[var(--color-charcoal)]">
          Gym {isLoggedInMember ? '' : <span className="font-normal text-[var(--color-muted)]">(optional)</span>}
        </label>
        <select
          id="member-gym"
          value={gymId}
          onChange={(e) => {
            setGymId(e.target.value);
            setPlanId('');
          }}
          disabled={gymsLoading}
          className="input-field"
        >
          <option value="">{gymsLoading ? 'Loading gyms...' : isLoggedInMember ? 'Choose a gym' : "I'll pick a gym later"}</option>
          {gyms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}, {g.city}
            </option>
          ))}
        </select>
      </div>

      {gym && (
        <>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-[var(--color-charcoal)]">Membership plan</legend>
            {gym.membershipPlans.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">This gym has no published plans yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {gym.membershipPlans.map((plan) => (
                  <label
                    key={plan.id}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-ring)] ${
                      planId === plan.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                    }`}
                  >
                    <input type="radio" name="plan" value={plan.id} checked={planId === plan.id} onChange={() => setPlanId(plan.id)} className="sr-only" />
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold text-[var(--color-deepgray)]">{plan.name}</span>
                      <span className="font-bold text-[var(--color-primary)]">{formatPrice(plan.price)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">
                      {plan.description || `${formatDuration(plan.duration)} access`}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <div>
            <label htmlFor="member-payment" className="mb-1.5 block text-sm font-semibold text-[var(--color-charcoal)]">
              How you'd like to pay
            </label>
            <select id="member-payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field">
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="CASH">Cash at the desk</option>
            </select>
          </div>
        </>
      )}
    </div>
  );

  if (isLoggedInMember) {
    return (
      <AuthSplitLayout role="member" title="Join a gym" subtitle={`Signed in as ${user.email}. Pick a gym and plan to send a membership request. Your other gym memberships stay as they are.`} wide>
        {error && <Banner>{error}</Banner>}
        <form onSubmit={joinGym} className="space-y-5" noValidate>
          {gymPicker}
          <SubmitButton busy={enrolling} busyLabel="Sending request...">Send request</SubmitButton>
        </form>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      role="member"
      title="Create your account"
      subtitle="Join a gym now or pick one later from your dashboard."
      top={<><RegistrationProgress current={2} /><AuthRoleTabs active="member" mode="register" /></>}
      wide
    >
      {user && (
        <Banner>
          You're signed in as {user.email}.{' '}
          <button type="button" onClick={() => logout()} className="font-bold underline">Log out</button> to create a member account.
        </Banner>
      )}
      {error && <Banner>{error}</Banner>}

      <form onSubmit={handleSubmit(createAccount)} className="space-y-5" noValidate>
        <section aria-labelledby="member-account-heading">
          <h2 id="member-account-heading" className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">Your account</h2>
          <AccountFields register={register} errors={errors} />
        </section>
        <section aria-labelledby="member-gym-heading">
          <h2 id="member-gym-heading" className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">Choose a gym and plan</h2>
          {gymPicker}
        </section>
        <TermsField register={register} errors={errors} />
        <SubmitButton busy={isSubmitting} busyLabel="Creating account...">Create account</SubmitButton>
      </form>

      <FormFooter>
        Already have an account? <Link to={ROUTES.login} className={footerLink}>Log in</Link>
      </FormFooter>
    </AuthSplitLayout>
  );
};

export default MemberRegisterPage;
