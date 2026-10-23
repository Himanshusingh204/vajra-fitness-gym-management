import { Link } from 'react-router';
import { CalendarCheck, CreditCard, MapPin } from 'lucide-react';
import { Button, PageHeader } from '../components/ui';
import { pageSeo, useRouteMeta } from '../hooks/usePageMeta';

const STEPS = [
  { icon: MapPin, title: 'Pick a gym', text: 'Open the directory, compare facilities and plans and choose the one near you.' },
  { icon: CreditCard, title: 'Choose a plan', text: 'Plans run for a set number of months. The price shown is what your gym charges.' },
  { icon: CalendarCheck, title: 'Get approved and train', text: 'Send your request. Once the gym approves it your membership is live and you can check in.' },
];

const GOOD_TO_KNOW = [
  'You pay your gym directly. Vajra Fitness does not take a cut of your membership fee.',
  'Your gym decides its own refund and freeze rules. Ask before you pay.',
  'You can follow your attendance, plan end date and workout plans from your dashboard.',
];

export default function MembershipPage() {
  useRouteMeta('/membership');
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader
        title={pageSeo['/membership'].h1}
        description="Three steps from finding a gym to your first session."
        actions={<Button to="/gyms">Find a gym</Button>}
      />

      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="rounded-card border border-line bg-surface p-5">
            <Icon className="size-5 text-accent-ink" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-ink">{i + 1}. {title}</h2>
            <p className="mt-1 text-ink-muted">{text}</p>
          </li>
        ))}
      </ol>

      <section className="mt-12" aria-labelledby="good">
        <h2 id="good" className="text-xl font-bold tracking-tight text-ink">Good to know</h2>
        <ul className="mt-4 max-w-[65ch] list-disc space-y-2 pl-5 text-ink-muted">
          {GOOD_TO_KNOW.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-ink-muted">
        Running a gym instead? See <Link to="/subscription" className="font-semibold text-accent-ink underline underline-offset-2">pricing for owners</Link>.
      </p>
    </div>
  );
}
