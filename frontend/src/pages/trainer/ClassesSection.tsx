import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, Timer, UsersRound } from 'lucide-react';
import { getClasses } from '../../api/class.api';
import { Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { useAuthStore } from '../../store/useAuthStore';
import { useTrainerMe } from './useTrainer';

export default function ClassesSection() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: me } = useTrainerMe();
  const gymId = me?.trainerDetails?.gym?.id;
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['memberClasses', gymId],
    queryFn: () => getClasses(gymId),
    enabled: !!gymId,
  });
  const mine = classes.filter((c) => c.trainer?.user.id === userId);

  return (
    <>
      <PageHeader title="Classes" description="Group classes your gym has assigned to you." />
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : mine.length === 0 ? (
        <Card><EmptyState icon={UsersRound} title="No classes assigned" description="The gym admin assigns trainers to classes." /></Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {mine.map((cls) => (
            <li key={cls.id}>
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-ink">{cls.name}</h2>
                  <StatusBadge status={cls.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                {cls.description && <p className="mt-2 text-sm text-ink-muted">{cls.description}</p>}
                <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
                  {cls.dayOfWeek && <li className="flex items-center gap-2"><CalendarDays className="size-4" aria-hidden="true" /> {cls.dayOfWeek}</li>}
                  {cls.startTime && <li className="flex items-center gap-2"><Clock className="size-4" aria-hidden="true" /> {cls.startTime} to {cls.endTime}</li>}
                  <li className="flex items-center gap-2"><Timer className="size-4" aria-hidden="true" /> {cls.duration} minutes</li>
                </ul>
                <p className="mt-3 text-sm font-medium text-ink">{cls._count?.bookings || 0} of {cls.capacity} booked</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
