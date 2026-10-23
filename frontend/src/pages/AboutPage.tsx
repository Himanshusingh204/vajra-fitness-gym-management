import { Link } from 'react-router';
import { Button, ImagePanel, PageHeader } from '../components/ui';
import { SITE_URL, pageSeo, useRouteMeta } from '../hooks/usePageMeta';

const PRINCIPLES = [
  ['Owners first', 'Most gyms still run on a register and a spreadsheet. We build for the person at the front desk, then for everyone else.'],
  ['Honest numbers', 'Reports show what was recorded: payments, check-ins and joins. Nothing is estimated or padded.'],
  ['Small data footprint', 'We collect what a gym needs to run, keep it encrypted in transit and do not sell it.'],
  ['Steady changes', 'Features ship because gym owners asked for them, in small releases that do not break daily work.'],
];

const ldOrg = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Vajra Fitness',
  url: `${SITE_URL}/about`,
  about: { '@type': 'Organization', name: 'Vajra Fitness', url: `${SITE_URL}/` },
};

export default function AboutPage() {
  useRouteMeta('/about', [ldOrg]);
  const seo = pageSeo['/about'];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title={seo.h1} description="Software for gyms in India, and a directory that helps people find one." />

      <div className="mt-10 grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-4 leading-relaxed text-ink-muted">
          <p>Vajra Fitness is not a gym. It is the software a gym runs on. Owners register their gym, add branches and plans, and manage members, fees, attendance, trainers and staff in one place.</p>
          <p>Members use the same platform to find an approved gym, join it, follow the plans their trainer writes and book sessions. Roles are separate, so a trainer sees their members and a front desk sees what it needs to.</p>
          <p>The platform is built for Indian gyms: rupee pricing, GST on invoices, UPI and cash payments recorded as they happen, and mobile numbers in the Indian format.</p>
        </div>
        <ImagePanel
          src="/images/feature-1.webp"
          alt="Rows of strength equipment on a gym floor"
          width={1200}
          height={900}
          label="Photo: gym floor with equipment"
        />
      </div>

      <section className="mt-16" aria-labelledby="principles">
        <h2 id="principles" className="text-2xl font-extrabold tracking-tight text-ink">How we work</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {PRINCIPLES.map(([title, text]) => (
            <div key={title}>
              <dt className="font-semibold text-ink">{title}</dt>
              <dd className="mt-1 text-ink-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-16 rounded-card bg-section-dark p-8 text-on-dark sm:p-10">
        <h2 className="text-2xl font-extrabold tracking-tight text-on-dark">Run a gym?</h2>
        <p className="mt-2 max-w-[55ch] text-on-dark-muted">Register it, pick a plan when you are ready and start adding members. Questions first? Read the <Link to="/faq" className="underline underline-offset-2">FAQ</Link> or write to us.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button to="/register/partner" size="lg">List your gym</Button>
          <Button to="/contact" variant="secondary" size="lg">Contact us</Button>
        </div>
      </section>
    </div>
  );
}
