import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { getGymAttendance } from '../../api/staff.api';
import { Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { localDateString } from '../../utils/format';
import { useStaffGym } from './useStaff';

export default function AttendanceSection() {
  const { gymId } = useStaffGym();
  const today = localDateString();
  const { data: attendance, isLoading } = useQuery({
    queryKey: ['todayAttendance', gymId, today],
    queryFn: () => getGymAttendance(gymId as string, { date: today, limit: 100 }),
    enabled: !!gymId,
  });

  return (
    <>
      <PageHeader
        title="Today's attendance"
        actions={<span className="text-sm font-medium text-ink-muted">{attendance?.total ?? 0} check-ins</span>}
      />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !attendance?.records || attendance.records.length === 0 ? (
        <Card><EmptyState icon={CalendarDays} title="No check-ins yet today" /></Card>
      ) : (
        <Card flush>
          <ul className="divide-y divide-line">
            {attendance.records.map((r: any) => {
              const name = r.member?.user?.username || r.staff?.user?.username;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-success-soft font-bold text-success-ink" aria-hidden="true">
                      {(name || '?').charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium text-ink">{name}</p>
                      <p className="text-sm text-ink-muted">
                        {r.member ? 'Member' : 'Staff'}, {new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
