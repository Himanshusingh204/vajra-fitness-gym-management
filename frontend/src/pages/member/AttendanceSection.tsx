import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { getMyAttendance } from '../../api/membership.api';
import { Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';

export default function AttendanceSection() {
  const { data: attendance, isLoading } = useQuery({ queryKey: ['myAttendance'], queryFn: getMyAttendance, refetchInterval: 30000 });

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Check in at your gym's front desk. Every visit shows up here."
        actions={<span className="text-sm font-medium text-ink-muted">Total visits: {attendance?.total ?? 0}</span>}
      />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !attendance?.records || attendance.records.length === 0 ? (
        <Card><EmptyState icon={CalendarDays} title="No attendance records yet" /></Card>
      ) : (
        <Card flush>
          <ul className="divide-y divide-line">
            {attendance.records.map((r: any) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-medium text-ink">
                    {new Date(r.checkIn).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-ink-muted">
                    Checked in at {new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
