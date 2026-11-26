import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { ChangeRequest } from '../../api/gym.api';
import DiffView from '../../components/ui/DiffView';
import { openDocument } from '../../api/onboarding.api';

const LABELS = {
  name: 'Gym name',
  address: 'Address',
  city: 'City',
  state: 'State',
  phone: 'Phone',
  email: 'Email',
  gstNumber: 'GST number',
};

// A new gym's application. On a resubmit, "Current" is what the owner sent last time.
const APPLICATION_LABELS = {
  name: 'Gym name',
  category: 'Type',
  phone: 'Phone',
  email: 'Email',
  gstNumber: 'GST number',
  address: 'Address',
  location: 'Area / landmark',
  city: 'City',
  state: 'State',
  postalCode: 'Pincode',
  establishedYear: 'Year started',
  description: 'About',
  facilities: 'Facilities',
  openingHours: 'Opening hours',
  galleryUrls: 'Photos',
  plans: 'Plans',
};
const DOCUMENT_NAMES: Record<string, string> = { ID_PROOF: 'Owner ID proof', BUSINESS_PROOF: 'Business proof', GST_CERT: 'GST certificate' };

const formatApplication = (key: string, value: unknown) => {
  if (key === 'plans' && Array.isArray(value)) {
    return value.map((p: { name: string; price: number; duration: number }) => `${p.name}: ₹${p.price} / ${p.duration} days`).join(', ') || '—';
  }
  if (key === 'galleryUrls' && Array.isArray(value)) {
    return value.length ? (
      <span className="flex flex-wrap gap-1">
        {value.map((url: string, i: number) => (
          <a key={url} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={`Photo ${i + 1}`} className="h-12 w-16 rounded object-cover" />
          </a>
        ))}
      </span>
    ) : '—';
  }
  if (Array.isArray(value)) return value.join(', ') || '—';
  return value == null || value === '' ? '—' : String(value);
};

type Decision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export default function ChangeRequestsPanel() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data: requests = [], isLoading, isError, refetch } = useQuery<ChangeRequest[]>({
    queryKey: ['admin-approvals'],
    queryFn: () => api.get('/admin/approvals').then((r) => r.data),
    refetchInterval: 30000,
  });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: Decision }) =>
      api.post(`/admin/approvals/${id}/decide`, { decision, note: notes[id] || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-approvals'] });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
  const error = (decide.error as any)?.response?.data?.issues?.[0]?.message ?? (decide.error as any)?.response?.data?.error;
  const [docError, setDocError] = useState('');
  const viewDocument = (id: string) => {
    setDocError('');
    openDocument(id).catch(() => setDocError('Could not open that file. Try again.'));
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="font-bold text-[var(--color-charcoal)] dark:text-white">Gym applications and profile changes ({requests.length})</h3>
      <p className="mt-0.5 text-sm text-gray-500">New gyms and changes to a gym's name, address or contact details. Check them before approving.</p>
      {(error || docError) && <p role="alert" className="mt-2 text-sm text-red-600">{error || docError}</p>}
      {isLoading ? (
        <p className="mt-3 text-sm text-gray-400">Loading…</p>
      ) : isError ? (
        <p role="alert" className="mt-3 text-sm text-red-600">Could not load applications. <button type="button" className="underline" onClick={() => refetch()}>Try again</button></p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">Nothing waiting for review.</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {requests.map((r) => {
            const isApplication = r.type === 'GYM_REGISTRATION';
            return (
            <li key={r.id} className="rounded-lg border border-[var(--color-border)] p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{isApplication ? 'New gym application' : 'Profile change'}</p>
              <p className="font-semibold dark:text-white">
                {r.gym?.name}, {r.gym?.city} <span className="font-normal text-gray-500">· {r.ref}</span>
              </p>
              <p className="text-xs text-gray-500">
                Requested by {r.requester?.username} ({r.requester?.email})
                {r.submittedAt && ` on ${new Date(r.submittedAt).toLocaleDateString('en-IN')}`}
              </p>
              <div className="mt-3">
                {isApplication ? (
                  <DiffView
                    current={r.currentValue as Record<string, unknown> | null}
                    proposed={(r.proposedValue ?? {}) as Record<string, unknown>}
                    labels={APPLICATION_LABELS}
                    format={formatApplication}
                  />
                ) : (
                  <DiffView current={r.currentValue} proposed={r.proposedValue ?? {}} labels={LABELS} changedOnly />
                )}
              </div>
              {isApplication && (
                <div className="mt-3">
                  <p className="font-semibold dark:text-white">Documents</p>
                  {r.documents?.length ? (
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {r.documents.map(({ document: d }) => (
                        <li key={d.id}>
                          <button type="button" onClick={() => viewDocument(d.id)} className="min-h-11 rounded-lg border border-[var(--color-border)] px-3 font-semibold text-[var(--color-primary)]">
                            {DOCUMENT_NAMES[d.kind] ?? d.kind} ({d.mime === 'application/pdf' ? 'PDF' : 'image'})
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No documents attached.</p>
                  )}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  className="input-field max-w-xs"
                  placeholder={isApplication ? 'Note to the owner (needed when asking for changes)' : 'Note to the owner (optional)'}
                  aria-label="Note to the owner"
                  maxLength={500}
                  value={notes[r.id] ?? ''}
                  onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                />
                <button
                  onClick={() => decide.mutate({ id: r.id, decision: 'APPROVED' })}
                  disabled={decide.isPending}
                  className="rounded-lg bg-green-600 min-h-11 px-3 font-bold text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide.mutate({ id: r.id, decision: 'REJECTED' })}
                  disabled={decide.isPending}
                  className="rounded-lg border border-[var(--color-border)] min-h-11 px-3 font-bold disabled:opacity-50"
                >
                  Reject
                </button>
                {isApplication && (
                  <button
                    onClick={() => decide.mutate({ id: r.id, decision: 'CHANGES_REQUESTED' })}
                    disabled={decide.isPending || !notes[r.id]?.trim()}
                    title={notes[r.id]?.trim() ? undefined : 'Write a note first'}
                    className="rounded-lg border border-[var(--color-border)] min-h-11 px-3 font-bold disabled:opacity-50"
                  >
                    Ask for changes
                  </button>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
