import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { ChangeRequest } from '../../api/gym.api';
import DiffView from '../../components/ui/DiffView';

const LABELS = {
  name: 'Gym name',
  address: 'Address',
  city: 'City',
  state: 'State',
  phone: 'Phone',
  email: 'Email',
  gstNumber: 'GST number',
};

export default function ChangeRequestsPanel() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data: requests = [], isLoading } = useQuery<ChangeRequest[]>({
    queryKey: ['admin-approvals'],
    queryFn: () => api.get('/admin/approvals').then((r) => r.data),
    refetchInterval: 30000,
  });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      api.post(`/admin/approvals/${id}/decide`, { decision, note: notes[id] || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-approvals'] });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
  const error = (decide.error as any)?.response?.data?.error;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="font-bold text-[var(--color-charcoal)] dark:text-white">Gym profile changes ({requests.length})</h3>
      <p className="mt-0.5 text-sm text-gray-500">Owners can't change these details themselves. Check them before approving.</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {isLoading ? (
        <p className="mt-3 text-sm text-gray-400">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">No change requests waiting for review.</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {requests.map((r) => (
            <li key={r.id} className="rounded-lg border border-[var(--color-border)] p-4 text-sm">
              <p className="font-semibold dark:text-white">
                {r.gym?.name}, {r.gym?.city} <span className="font-normal text-gray-500">· {r.ref}</span>
              </p>
              <p className="text-xs text-gray-500">
                Requested by {r.requester?.username} ({r.requester?.email})
                {r.submittedAt && ` on ${new Date(r.submittedAt).toLocaleDateString('en-IN')}`}
              </p>
              <div className="mt-3">
                <DiffView current={r.currentValue} proposed={r.proposedValue ?? {}} labels={LABELS} changedOnly />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  className="input-field max-w-xs"
                  placeholder="Note to the owner (optional)"
                  aria-label="Note to the owner"
                  maxLength={500}
                  value={notes[r.id] ?? ''}
                  onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                />
                <button
                  onClick={() => decide.mutate({ id: r.id, decision: 'APPROVED' })}
                  disabled={decide.isPending}
                  className="rounded-lg bg-green-600 px-3 py-1.5 font-bold text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide.mutate({ id: r.id, decision: 'REJECTED' })}
                  disabled={decide.isPending}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 font-bold disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
