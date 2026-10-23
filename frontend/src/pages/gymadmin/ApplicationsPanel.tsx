import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, UserCheck, X } from 'lucide-react';
import { approveTrainerApplication, getTrainerApplications, rejectTrainerApplication, type TrainerApplication } from '../../api/gymAdmin.api';
import { Button, Card, Dialog, EmptyState, Field, Input, Skeleton } from '../../components/ui';
import { useGym } from './GymContext';

const errorText = (err: unknown) => (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Something went wrong. Try again.';

export default function ApplicationsPanel() {
  const { gym } = useGym();
  const gymId = gym?.id ?? '';
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState<TrainerApplication | null>(null);
  const [reason, setReason] = useState('');

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['trainer-applications', gymId, 'PENDING'],
    queryFn: () => getTrainerApplications(gymId, 'PENDING'),
    enabled: !!gymId,
    refetchInterval: 30000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['trainer-applications', gymId] });
    qc.invalidateQueries({ queryKey: ['staff', gymId] });
    qc.invalidateQueries({ queryKey: ['gym-stats', gymId] });
  };

  const approve = useMutation({ mutationFn: approveTrainerApplication, onSuccess: refresh });
  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => rejectTrainerApplication(id, note.trim() || undefined),
    onSuccess: () => {
      refresh();
      setRejecting(null);
      setReason('');
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      {approve.isError && (
        <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger-ink">
          {errorText(approve.error)}
        </p>
      )}

      {applications.length === 0 ? (
        <Card>
          <EmptyState icon={UserCheck} title="No pending applications" description="Trainers who sign up for your gym show up here for approval." />
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {applications.map((a) => (
            <li key={a.id}>
              <Card className="flex h-full flex-col gap-3">
                <div>
                  <p className="font-semibold text-ink">{a.user.username}</p>
                  <p className="text-sm text-ink-muted">
                    {a.user.email}
                    {a.user.phone ? ` · ${a.user.phone}` : ''}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-ink-muted">Specialization</dt>
                  <dd className="text-ink">{a.specialization || '-'}</dd>
                  <dt className="text-ink-muted">Experience</dt>
                  <dd className="text-ink">{a.experienceYears != null ? `${a.experienceYears} years` : '-'}</dd>
                  <dt className="text-ink-muted">City</dt>
                  <dd className="text-ink">{a.city || '-'}</dd>
                  <dt className="text-ink-muted">Applied</dt>
                  <dd className="text-ink">{new Date(a.user.createdAt).toLocaleDateString('en-IN')}</dd>
                </dl>
                {a.bio && <p className="text-sm text-ink-muted">{a.bio}</p>}
                <div className="mt-auto flex gap-2 pt-1">
                  <Button icon={Check} size="sm" loading={approve.isPending && approve.variables === a.id} onClick={() => approve.mutate(a.id)}>
                    Approve
                  </Button>
                  <Button variant="secondary" icon={X} size="sm" onClick={() => setRejecting(a)}>
                    Reject
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject application"
        description={rejecting ? `${rejecting.user.username} will be told the application was not accepted.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={reject.isPending} onClick={() => rejecting && reject.mutate({ id: rejecting.id, note: reason })}>
              Reject application
            </Button>
          </>
        }
      >
        <Field label="Reason (optional)" hint="Shared with the applicant.">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
        {reject.isError && (
          <p role="alert" className="mt-3 text-sm text-danger-ink">
            {errorText(reject.error)}
          </p>
        )}
      </Dialog>
    </div>
  );
}
