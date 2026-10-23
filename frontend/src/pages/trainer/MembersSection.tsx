import { Users } from 'lucide-react';
import { Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { useGymMembers, useTrainerMe } from './useTrainer';

export default function MembersSection() {
  const { data: me } = useTrainerMe();
  const gymName = me?.trainerDetails?.gym?.name;
  const { data: members, isLoading } = useGymMembers(me?.trainerDetails?.gym?.id);

  return (
    <>
      <PageHeader title="Members" description={`Members at ${gymName || 'your gym'}.`} />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !members || members.length === 0 ? (
        <Card><EmptyState icon={Users} title="No members found" /></Card>
      ) : (
        <Card flush>
          <ul className="divide-y divide-line">
            {members.map((m: any) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent-ink" aria-hidden="true">
                    {m.user?.username?.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{m.user?.username}</p>
                    <p className="truncate text-sm text-ink-muted">{m.user?.email}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <StatusBadge status={m.status} />
                  <span className="text-sm text-ink-muted">{m.membershipPlan?.name || 'No plan'}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
