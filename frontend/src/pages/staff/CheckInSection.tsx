import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Search, UserPlus, Users } from 'lucide-react';
import { getGymAttendance, markAttendance } from '../../api/staff.api';
import { Button, Card, EmptyState, Field, Input, PageHeader, Skeleton } from '../../components/ui';
import { localDateString } from '../../utils/format';
import { matchesSearch, useGymMembers, useStaffGym } from './useStaff';

export default function CheckInSection() {
  const queryClient = useQueryClient();
  const { gymId } = useStaffGym();
  const [search, setSearch] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const today = localDateString();
  const todayLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const { data: members, isLoading } = useGymMembers(gymId);
  const { data: attendance } = useQuery({
    queryKey: ['todayAttendance', gymId, today],
    queryFn: () => getGymAttendance(gymId as string, { date: today, limit: 100 }),
    enabled: !!gymId,
  });

  const checkIn = useMutation({
    mutationFn: (memberId: string) => markAttendance(gymId as string, { memberId }),
    onSuccess: (_data, memberId) => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance', gymId, today] });
      queryClient.invalidateQueries({ queryKey: ['gymMembers', gymId] });
      const member = (members || []).find((m: any) => m.id === memberId);
      setAnnouncement(`${member?.user?.username ?? 'Member'} checked in.`);
    },
  });

  const checkedIn = new Set((attendance?.records || []).map((r: any) => r.memberId));
  const filtered = (members || []).filter((m: any) => matchesSearch(m, search));

  return (
    <>
      <PageHeader title="Check-in" description={`Check in a member for today, ${todayLabel}.`} />
      <div aria-live="polite" className="sr-only">{announcement}</div>

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
                      <p className="truncate text-sm text-ink-muted">{m.user?.email}</p>
                    </div>
                  </div>
                  {checkedIn.has(m.id) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-ink">
                      <CheckCircle2 className="size-4" aria-hidden="true" /> Checked in
                    </span>
                  ) : (
                    <Button size="sm" icon={UserPlus} disabled={checkIn.isPending} loading={checkIn.isPending && checkIn.variables === m.id} onClick={() => checkIn.mutate(m.id)}>
                      Check in
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
