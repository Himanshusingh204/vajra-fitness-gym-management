import { Link } from 'react-router';
import { Calculator, Dumbbell, Flame, Scale } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import { pageSeo, useRouteMeta } from '../../hooks/usePageMeta';

const TOOLS = [
  { path: '/tools/bmi-calculator', icon: Scale, text: 'Body mass index from height and weight, with standard and South Asian cut-offs.' },
  { path: '/tools/calorie-calculator', icon: Flame, text: 'Calories you burn each day and a target for losing, holding or gaining weight.' },
  { path: '/tools/one-rep-max-calculator', icon: Dumbbell, text: 'Estimate your max lift from a lighter set and get working weights by percentage.' },
  { path: '/tools/protein-calculator', icon: Calculator, text: 'A daily protein range in grams for your weight and goal.' },
];

export default function ToolsPage() {
  useRouteMeta('/tools');
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title={pageSeo['/tools'].h1} description="They run in your browser. Nothing you enter is sent anywhere or saved." />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {TOOLS.map(({ path, icon: Icon, text }) => (
          <li key={path}>
            <Link to={path} className="block h-full rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong">
              <Icon className="size-5 text-accent-ink" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-semibold text-ink">{pageSeo[path].h1}</h2>
              <p className="mt-1 text-ink-muted">{text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
