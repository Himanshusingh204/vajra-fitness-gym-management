import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CalendarCheck, CreditCard, Dumbbell, UserPlus, Users } from 'lucide-react';
import { Button, ImagePanel, buttonClasses } from '../components/ui';
import { getPublicStats, type PublicStats } from '../api/content.api';
import { SITE_URL, pageSeo, useRouteMeta } from '../hooks/usePageMeta';

const STAT_LABELS: [keyof PublicStats, string][] = [
  ['gyms', 'Gyms'],
  ['members', 'Members'],
  ['trainers', 'Trainers'],
  ['cities', 'Cities'],
];

const OWNER_FEATURES = [
  { icon: Users, title: 'Members and renewals', text: 'Plans, start and end dates and renewals for every member, with branch-level views.' },
  { icon: CreditCard, title: 'Fees and receipts', text: 'Record cash, UPI, card and bank payments, see who is overdue and hand out PDF receipts.' },
  { icon: CalendarCheck, title: 'Attendance', text: 'Daily check-ins for members and staff, with reports by day, branch and plan.' },
  { icon: Dumbbell, title: 'Trainers and workout plans', text: 'Approve trainers, assign members to them and let them write workout and diet plans.' },
  { icon: BarChart3, title: 'Reports', text: 'Revenue, new joins and retention for the gym, without exporting to a spreadsheet first.' },
  { icon: UserPlus, title: 'Enquiries', text: 'Website enquiries land in one list so walk-ins and calls do not get lost.' },
];

const STEPS = [
  ['Register your gym', 'Create an owner account and add your branches and plans.'],
  ['Get approved', 'We review the listing before it goes into the public directory.'],
  ['Bring in members', 'Share your gym page. Members request a plan and you approve them.'],
];

const ldSoftware = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Vajra Fitness',
  url: `${SITE_URL}/`,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: pageSeo['/'].description,
};

export default function HomePage() {
  useRouteMeta('/', [ldSoftware]);
  const seo = pageSeo['/'];
  const { data: stats } = useQuery({ queryKey: ['public-stats'], queryFn: getPublicStats, staleTime: 5 * 60_000 });
  const showStats = stats && stats.gyms > 0;

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">{seo.h1}</h1>
          <p className="mt-5 max-w-[55ch] text-lg leading-relaxed text-ink-muted">
            Vajra Fitness keeps memberships, fees, attendance, trainers and workout plans in one place. Members can find a gym, join it and follow their plan from their phone.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/register/partner" size="lg">List your gym</Button>
            <Button to="/gyms" variant="secondary" size="lg">Find a gym</Button>
          </div>
        </div>
        <ImagePanel
          src="/images/home-hero.webp"
          alt="A lifter setting up a deadlift in a gym"
          width={1600}
          height={1000}
          priority
          label="Photo: lifter in a gym, wide shot"
        />
      </section>

      {showStats && (
        <section aria-label="Platform numbers" className="border-y border-line bg-surface">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
            {STAT_LABELS.map(([key, label]) => (
              <div key={key}>
                <dd className="text-3xl font-extrabold tracking-tight text-ink tabular-nums">{stats[key].toLocaleString('en-IN')}</dd>
                <dt className="text-sm text-ink-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-ink">What gym owners get</h2>
        <p className="mt-3 max-w-[60ch] text-ink-muted">The daily work of a gym front desk and back office, in one account that works for one branch or many.</p>
        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {OWNER_FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-ink">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-ink-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-section-dark text-on-dark">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <ImagePanel
            src="/images/feature-2.webp"
            alt="A trainer showing a member a stretch"
            width={1200}
            height={900}
            label="Photo: trainer coaching a member"
          />
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-on-dark">For members</h2>
            <p className="mt-3 max-w-[55ch] text-on-dark-muted">
              Look through the gyms near you, compare plans and facilities and send a join request. After approval your plan, attendance and trainer plans sit in one dashboard, and you can book sessions when your gym offers them.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/register/member" className={buttonClasses('primary', 'lg')}>Join a gym</Link>
              <Link to="/tools" className={buttonClasses('secondary', 'lg')}>Try the calculators</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">Getting a gym live</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="border-t-2 border-accent pt-4">
              <p className="text-sm font-semibold text-accent-ink">Step {i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-ink-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-ink-muted">
          See the <Link to="/subscription" className="font-semibold text-accent-ink underline underline-offset-2">plans and pricing</Link> or read the <Link to="/faq" className="font-semibold text-accent-ink underline underline-offset-2">FAQ</Link>.
        </p>
      </section>
    </>
  );
}
