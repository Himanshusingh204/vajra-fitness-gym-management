import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Card, EmptyState, Field, Input, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { matchesSearch, useGymMembers, useStaffGym } from './useStaff';

export default function MembersSection() {
  const { gymId } = useStaffGym();
  const { data: members, isLoading } = useGymMembers(gymId);
  const [search, setSearch] = useState('');
  const filtered = (members || []).filter((m: any) => matchesSearch(m, search));

  return (
    <>
      <PageHeader title="Member lookup" description="Find a member's contact details, plan and status." />
      <Card>
        <Field label="Search members">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <Input className="pl-10" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </Field>

        <div className="mt-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No members found" />
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((m: any) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent-ink" aria-hidden="true">
                      {m.user?.username?.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{m.user?.username}</p>
                      <p className="truncate text-sm text-ink-muted">{m.user?.email}, {m.user?.phone || 'no phone'}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <StatusBadge status={m.status} />
                    <span className="text-sm text-ink-muted">{m.membershipPlan?.name || 'No plan'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
