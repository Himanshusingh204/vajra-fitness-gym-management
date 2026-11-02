import type { ReactNode } from 'react';

export type AuthRole = 'member' | 'trainer' | 'owner' | 'admin';

const AUTH_IMAGES: Record<AuthRole, string> = {
  member: '/images/auth-member-pexels.jpg',
  trainer: '/images/auth-trainer-pexels.jpg',
  owner: '/images/auth-owner-pexels.jpg',
  admin: '/images/auth-admin-pexels.jpg',
};

const PANELS: Record<AuthRole, { alt: string; tag: string; headline: string; copy: string }> = {
  member: {
    alt: 'Athlete lifting a barbell in a brick-walled gym',
    tag: 'Members',
    headline: 'Stronger people. Happier lives.',
    copy: 'Your membership, check-ins and workouts in one place.',
  },
  trainer: {
    alt: 'Personal trainer discussing a workout plan with a client',
    tag: 'Trainers',
    headline: 'Train. Guide. Inspire.',
    copy: 'Your clients, sessions and plans, ready when you are.',
  },
  owner: {
    alt: 'Modern gym interior with strength and cardio equipment',
    tag: 'Gym owners',
    headline: 'Your gym. Your rules.',
    copy: 'Members, staff, billing and reports for your gym.',
  },
  admin: {
    alt: 'Athletes participating in a coached indoor gym workout',
    tag: 'Platform',
    headline: 'Manage. Monitor. Grow.',
    copy: 'Every gym on the platform, from one console.',
  },
};

interface AuthSplitLayoutProps {
  role: AuthRole;
  title: string;
  subtitle?: string;
  /** Sits above the title, e.g. the role tabs. */
  top?: ReactNode;
  wide?: boolean;
  /** Small tag above the title; defaults to the role name. */
  eyebrow?: string;
  /** Skip the card tray, for content that brings its own cards. */
  bare?: boolean;
  children: ReactNode;
}

const AuthSplitLayout = ({ role, title, subtitle, top, wide = false, eyebrow, bare = false, children }: AuthSplitLayoutProps) => {
  const panel = PANELS[role];
  return (
    <div className="relative grid min-h-[calc(100dvh-5rem)] overflow-hidden bg-[var(--color-base)] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
      <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
        <img src="/images/auth-atmosphere.webp" alt="" className="h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-[var(--color-base)]/80" />
      </div>
      <aside className="relative z-10 block h-40 overflow-hidden bg-[var(--color-section-dark)] md:sticky md:top-[88px] md:h-[calc(100dvh-88px)] md:min-h-[560px] md:rounded-tr-[2.5rem]">
        <img src={AUTH_IMAGES[role]} alt={panel.alt} className="absolute inset-0 h-full w-full object-cover object-center md:object-[center_35%]" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 max-w-xl p-5 md:p-8 lg:p-10 xl:p-14">
          <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75 md:mb-4 md:text-xs">
            <span className="h-px w-8 bg-[var(--color-primary)]" />
            {panel.tag}
          </p>
          <h2 className="font-display text-3xl uppercase leading-[0.92] tracking-wide text-white md:text-5xl lg:text-6xl xl:text-7xl">{panel.headline}</h2>
          <p className="mt-4 hidden max-w-sm text-base leading-relaxed text-white/75 md:block">{panel.copy}</p>
        </div>
      </aside>

      <section className="relative z-10 flex min-w-0 justify-center px-4 pb-16 pt-8 sm:px-8 md:items-center md:py-12 lg:px-14">
        <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-[28rem]'}`}>
          <div className="auth-stagger">
            {top}
            <p className="mb-4 inline-flex rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              {eyebrow ?? panel.tag}
            </p>
            <h1 className="text-[2rem] font-extrabold leading-[1.05] tracking-tight text-[var(--color-deepgray)] sm:text-[2.5rem]">{title}</h1>
            {subtitle && <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-[var(--color-muted)]">{subtitle}</p>}
          </div>
          {bare ? (
            <div className="auth-fields mt-8">{children}</div>
          ) : (
            // Outer tray + inner plate. The tray only shows from sm up so phones keep the full width.
            <div className="mt-8 sm:rounded-[2rem] sm:bg-black/[0.03] sm:p-1.5 sm:ring-1 sm:ring-black/5 dark:sm:bg-white/[0.03] dark:sm:ring-white/10">
              <div className="auth-fields sm:rounded-[calc(2rem-0.375rem)] sm:bg-[var(--color-surface)] sm:p-8 sm:shadow-[0_30px_60px_-30px_rgba(40,20,20,0.18),inset_0_1px_0_rgba(255,255,255,0.6)] dark:sm:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] [&_.input-field]:h-12 [&_.input-field]:rounded-xl [&_.input-field]:border-[var(--color-border)] [&_.input-field]:bg-[var(--color-base)] [&_.input-field]:text-base [&_.input-field]:transition-[border-color,box-shadow,background-color] [&_.input-field]:duration-300 [&_.input-field]:ease-[cubic-bezier(0.32,0.72,0,1)] [&_.input-field:hover]:border-[var(--color-border-strong)] [&_.input-field:focus]:border-[var(--color-primary)] [&_.input-field:focus]:bg-[var(--color-surface)] [&_.input-field:focus]:ring-4">
                {children}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AuthSplitLayout;
