import { Link } from 'react-router';
import { ChevronRight, Building2, Dumbbell, User } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AuthPageFrame } from '../../layouts/AuthLayout';

const OPTIONS = [
  { to: '/register/member', icon: User, title: 'I train at a gym', text: 'Join your gym as a member.' },
  { to: '/register/trainer', icon: Dumbbell, title: 'I am a trainer', text: 'Work with clients at a gym.' },
  { to: '/register/partner', icon: Building2, title: 'I run a gym', text: 'Start a 14-day free trial.' },
];

export default function RegisterChooserPage() {
  usePageMeta('Create an account', undefined, '/register');
  return (
    <AuthPageFrame title="Create an account" subtitle="Choose how you use Vajra Fitness.">
      <ul className="flex flex-col gap-3">
        {OPTIONS.map(({ to, icon: Icon, title, text }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-ink">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{title}</span>
                <span className="block text-sm text-ink-muted">{text}</span>
              </span>
              <ChevronRight className="size-5 text-ink-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent-ink hover:underline">Log in</Link>
      </p>
    </AuthPageFrame>
  );
}
