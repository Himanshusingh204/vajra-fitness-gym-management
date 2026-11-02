import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
import { createWebsiteRequest, getMyWebsiteRequests, type WebsiteRequest } from '../../api/websiteRequest.api';

const STATUS_STYLE: Record<WebsiteRequest['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const STATUS_TEXT: Record<WebsiteRequest['status'], string> = {
  PENDING: 'Waiting for approval',
  APPROVED: 'Live',
  REJECTED: 'Not approved',
};

export default function WebsiteRequestCard() {
  const qc = useQueryClient();
  const [slug, setSlug] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const { data: requests = [], isLoading } = useQuery({ queryKey: ['website-requests', 'mine'], queryFn: getMyWebsiteRequests });
  const hasPending = requests.some((r) => r.status === 'PENDING');

  const submit = useMutation({
    mutationFn: () => createWebsiteRequest({ desiredSlug: slug, note: note || undefined }),
    onSuccess: () => {
      setSent(true);
      setSlug('');
      setNote('');
      qc.invalidateQueries({ queryKey: ['website-requests'] });
    },
  });
  const error = (submit.error as any)?.response?.data?.error;

  return (
    <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="flex items-center gap-2 font-bold text-[var(--color-charcoal)] dark:text-white">
        <Globe size={18} /> Your own gym website
      </h3>
      <p className="mt-1 text-sm text-gray-500">Paid add-on. Pick an address and we will set up your site after approval.</p>

      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <input
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setSent(false); }}
          placeholder="your-gym-name"
          required
          className="input-field text-sm"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything we should know (optional)"
          maxLength={500}
          className="input-field text-sm"
        />
        <button
          type="submit"
          disabled={submit.isPending || hasPending}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2"
        >
          {hasPending ? 'Request pending' : 'Request website'}
        </button>
        {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        {sent && !error && (
          <p role="status" className="rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400 sm:col-span-2">
            Request sent. We will review it and your site address will show up below once it is approved.
          </p>
        )}
      </form>

      {isLoading ? (
        <div className="mt-4 h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
      ) : requests.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--color-border)] px-4 py-5 text-center text-sm text-gray-500">
          No website requests yet. Choose the address you want above and send your first request.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--color-border)] text-sm">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                {r.status === 'APPROVED' ? (
                  <a href={`/g/${r.desiredSlug}`} target="_blank" rel="noreferrer" className="font-semibold text-[var(--color-primary)] underline">
                    /g/{r.desiredSlug}
                  </a>
                ) : (
                  <span className="font-semibold">/g/{r.desiredSlug}</span>
                )}
                <p className="text-xs text-gray-500">{STATUS_TEXT[r.status]}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[r.status]}`}>{r.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
