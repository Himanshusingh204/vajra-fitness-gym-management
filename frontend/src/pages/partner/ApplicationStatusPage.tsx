import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import StatusBadge from '../../components/ui/StatusBadge';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getApplication, type ApplicationStatus } from '../../api/onboarding.api';

const COPY: Record<ApplicationStatus, { title: string; text: string }> = {
  DRAFT: { title: 'Your application is not sent yet', text: 'Finish the steps and submit it. Your answers are saved, so you can continue where you left off.' },
  PENDING_REVIEW: { title: 'We are checking your application', text: 'Our team is going through your details and documents. You will get a notification when we are done.' },
  CHANGES_REQUESTED: { title: 'A few changes needed', text: 'Read the note from our team, update your application and send it again.' },
  APPROVED: { title: 'Your gym is approved', text: 'Your gym is listed on Kavach Fitness. Members can now find it.' },
  REJECTED: { title: 'Your application was not approved', text: 'Read the note from our team. If you think this is a mistake, contact us.' },
  SUSPENDED: { title: 'Your gym is suspended', text: 'Contact our team to sort this out.' },
};

export default function ApplicationStatusPage() {
  usePageMeta('Application status', 'Status of your gym application on Kavach Fitness.', '/partner/application');
  const { data, isLoading, isError } = useQuery({ queryKey: ['onboarding'], queryFn: getApplication, refetchInterval: 60000 });

  if (isLoading) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-[var(--color-muted)]">Loading…</div>;
  if (isError || !data) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-[var(--color-muted)]">Could not load your application. Refresh the page to try again.</div>;

  const { gym, request } = data;
  const copy = COPY[gym.status] ?? COPY.DRAFT;
  const editable = gym.status === 'DRAFT' || gym.status === 'CHANGES_REQUESTED';

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">Gym application</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold text-[var(--color-deepgray)]">{gym.name}</h1>
        <StatusBadge status={gym.status} />
      </div>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{gym.city}{request && ` · ${request.ref}`}</p>

      <section className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="font-bold text-[var(--color-deepgray)]">{copy.title}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{copy.text}</p>

        {request?.reviewNote && gym.status !== 'PENDING_REVIEW' && (
          <div className="mt-4 rounded-lg border border-[var(--color-border)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Note from our team</p>
            <p className="mt-1 whitespace-pre-line text-sm text-[var(--color-charcoal)]">{request.reviewNote}</p>
          </div>
        )}

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {request?.submittedAt && (
            <div>
              <dt className="text-[var(--color-muted)]">Last sent</dt>
              <dd className="font-semibold text-[var(--color-charcoal)]">{new Date(request.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
            </div>
          )}
          {request?.decidedAt && (
            <div>
              <dt className="text-[var(--color-muted)]">Reviewed</dt>
              <dd className="font-semibold text-[var(--color-charcoal)]">{new Date(request.decidedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
            </div>
          )}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {editable && (
            <Link to={gym.status === 'CHANGES_REQUESTED' ? '/partner/apply/review' : '/partner/apply/details'} className="btn-primary min-h-11">
              {gym.status === 'CHANGES_REQUESTED' ? 'Update and send again' : 'Continue application'}
            </Link>
          )}
          <Link to="/owner" className="btn-outline min-h-11">Go to gym console</Link>
          {(gym.status === 'REJECTED' || gym.status === 'SUSPENDED') && <Link to="/contact" className="btn-ghost min-h-11">Contact us</Link>}
        </div>
      </section>
    </div>
  );
}
