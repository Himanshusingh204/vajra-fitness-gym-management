import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, MapPinned, XCircle } from 'lucide-react';
import { approveBranch, getPendingBranches, rejectBranch, type PendingBranch } from '../../api/branch.api';
import { errorMessage } from '../../api/superadmin.api';
import { Button, Dialog, EmptyState, Field, PageHeader, Skeleton, Textarea } from '../../components/ui';
import { Panel } from './Panel';

export default function Branches() {
  const qc = useQueryClient();
  const { data: branches = [], isLoading } = useQuery({ queryKey: ['pending-branches'], queryFn: getPendingBranches, refetchInterval: 30000 });
  const [rejecting, setRejecting] = useState<PendingBranch | null>(null);
  const [reason, setReason] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['pending-branches'] });
    qc.invalidateQueries({ queryKey: ['admin-audit'] });
  };
  const approve = useMutation({ mutationFn: approveBranch, onSuccess: refresh });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectBranch(id, reason),
    onSuccess: () => {
      refresh();
      setRejecting(null);
      setReason('');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Branch approvals" description="Gym owners request new branches here before they go live." />

      <Panel title={`Pending branch requests (${branches.length})`}>
        {isLoading ? (
          <div className="space-y-3 p-4" aria-busy="true">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : branches.length === 0 ? (
          <EmptyState title="No branch requests waiting" description="New requests from gym owners show up here." icon={MapPinned} />
        ) : (
          <ul className="divide-y divide-line">
            {branches.map((b) => (
              <li key={b.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{b.name}</p>
                  <p className="text-sm text-ink-muted">
                    {b.address}, {b.city}, {b.state}
                    {b.phone ? `, +91 ${b.phone}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Requested by {b.gym.owner.username} ({b.gym.owner.email}) for {b.gym.name}, {b.gym.city}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" icon={CheckCircle} onClick={() => approve.mutate(b.id)} disabled={approve.isPending}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={XCircle}
                    onClick={() => {
                      setRejecting(b);
                      setReason('');
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {approve.isError && (
          <p role="alert" className="px-4 pb-4 text-sm font-medium text-danger-ink sm:px-5">
            {errorMessage(approve.error, 'Failed to approve branch.')}
          </p>
        )}
      </Panel>

      <Dialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject "${rejecting?.name ?? ''}"?`}
        description="The gym owner will see this reason on their dashboard."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={reject.isPending}
              onClick={() => rejecting && reject.mutate({ id: rejecting.id, reason: reason || undefined })}
            >
              Reject branch
            </Button>
          </>
        }
      >
        <Field label="Reason (optional)">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: address could not be verified" />
        </Field>
      </Dialog>
    </div>
  );
}
