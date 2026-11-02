import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import AuthSplitLayout from '../../components/AuthSplitLayout';
import { FormFooter } from './formParts';
import { footerLink } from './authForm';
import { ROUTES } from '../../utils/routes';
import RegistrationProgress from './RegistrationProgress';

const OPTIONS = [
  { to: ROUTES.memberRegister, image: '/images/auth-member-pexels.jpg', title: "I'm a member", text: 'Join a gym, book sessions and track your progress.' },
  { to: ROUTES.trainerRegister, image: '/images/auth-trainer-pexels.jpg', title: "I'm a trainer", text: 'Apply to coach at a gym and manage your clients.' },
  { to: ROUTES.partnerRegister, image: '/images/auth-owner-pexels.jpg', title: "I'm a gym owner", text: 'List your gym and run members, staff and billing.' },
];

const RegisterChooserPage = () => {
  usePageMeta('Create your account', 'Sign up to Kavach Fitness as a member, trainer or gym owner.', ROUTES.register);
  return (
    <AuthSplitLayout role="member" eyebrow="Sign up" bare title="Create your account" subtitle="Pick the account that fits you." top={<RegistrationProgress current={1} />}>
      <ul className="space-y-3">
        {OPTIONS.map(({ to, image, title, text }) => (
          <li key={to}>
            <Link
              to={to}
              className="group block rounded-[1.5rem] bg-black/[0.03] p-1 ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-ring)] active:scale-[0.98] dark:bg-white/[0.03] dark:ring-white/10"
            >
              <span className="flex items-center gap-4 rounded-[calc(1.5rem-0.25rem)] bg-[var(--color-surface)] p-2.5 pr-4 shadow-[0_18px_40px_-28px_rgba(40,20,20,0.35)] transition-shadow duration-500 group-hover:shadow-[0_22px_48px_-24px_rgba(40,20,20,0.45)]">
                <img src={image} alt="" width="88" height="88" loading="lazy" className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-[1rem] object-cover sm:h-[5.5rem] sm:w-[5.5rem]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-[var(--color-deepgray)]">{title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-[var(--color-muted)]">{text}</span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
                  <ArrowRight strokeWidth={1.75} className="h-4 w-4" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <FormFooter>
        Already have an account? <Link to={ROUTES.login} className={footerLink}>Log in</Link>
      </FormFooter>
    </AuthSplitLayout>
  );
};

export default RegisterChooserPage;
