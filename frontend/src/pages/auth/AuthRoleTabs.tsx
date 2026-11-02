import { Link } from 'react-router';
import { Building2, Dumbbell, User } from 'lucide-react';
import { ROUTES } from '../../utils/routes';

type TabRole = 'member' | 'trainer' | 'owner';

const TABS = [
  { role: 'member', label: 'Member', icon: User, login: ROUTES.login, register: ROUTES.memberRegister },
  { role: 'trainer', label: 'Trainer', icon: Dumbbell, login: ROUTES.trainerLogin, register: ROUTES.trainerRegister },
  { role: 'owner', label: 'Gym Owner', icon: Building2, login: ROUTES.partnerLogin, register: ROUTES.partnerRegister },
] as const;

const AuthRoleTabs = ({ active, mode }: { active: TabRole; mode: 'login' | 'register' }) => (
  <nav aria-label={mode === 'login' ? 'Sign in as' : 'Create an account as'} className="mb-7 grid grid-cols-3 gap-1 rounded-2xl bg-black/[0.04] p-1 ring-1 ring-black/5 dark:bg-white/[0.04] dark:ring-white/10">
    {TABS.map(({ role, label, icon: Icon, login, register }) => {
      const current = role === active;
      return (
        <Link
          key={role}
          to={mode === 'login' ? login : register}
          aria-current={current ? 'page' : undefined}
          className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:text-sm ${
            current
              ? 'bg-[var(--color-surface)] text-[var(--color-deepgray)] shadow-[0_6px_16px_-8px_rgba(40,20,20,0.35)] dark:bg-white/10'
              : 'text-[var(--color-muted)] hover:text-[var(--color-charcoal)]'
          }`}
        >
          <Icon strokeWidth={1.5} className="hidden h-4 w-4 shrink-0 min-[400px]:block" />
          <span className="truncate">{label}</span>
        </Link>
      );
    })}
  </nav>
);

export default AuthRoleTabs;
