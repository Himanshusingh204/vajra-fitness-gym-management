import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllWebsiteRequests, decideWebsiteRequest } from '../../api/websiteRequest.api';

export default function WebsiteRequestsPanel() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['website-requests', 'all'], queryFn: getAllWebsiteRequests });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => decideWebsiteRequest(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-requests'] }),
  });
  const error = (decide.error as any)?.response?.data?.error;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="font-bold text-[var(--color-charcoal)] dark:text-white">Website requests</h3>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {isLoading ? (
        <p className="mt-3 text-sm text-gray-400">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">No requests yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--color-border)]">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <p className="font-semibold">{r.gym?.name} <span className="font-normal text-gray-500">/ {r.desiredSlug}</span></p>
                {r.note && <p className="text-gray-500">{r.note}</p>}
              </div>
              {r.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button onClick={() => decide.mutate({ id: r.id, action: 'approve' })} className="rounded-lg bg-green-600 px-3 py-1 font-bold text-white">Approve</button>
                  <button onClick={() => decide.mutate({ id: r.id, action: 'reject' })} className="rounded-lg border border-[var(--color-border)] px-3 py-1 font-bold">Reject</button>
                </div>
              ) : (
                <span className="font-semibold">{r.status}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
