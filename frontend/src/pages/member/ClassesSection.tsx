import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, Timer, User, UsersRound } from 'lucide-react';
import { getClasses, bookClass } from '../../api/class.api';
import { Button, Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { useMemberProfile } from './useMemberProfile';

export default function ClassesSection() {
  const queryClient = useQueryClient();
  const { data: profile } = useMemberProfile();
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['memberClasses', profile?.gymId],
    queryFn: () => getClasses(profile?.gymId),
    enabled: !!profile?.gymId,
    refetchInterval: 60000,
  });
  const bookMutation = useMutation({
    mutationFn: (classId: string) => bookClass(classId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memberClasses'] }),
  });

  return (
    <>
      <PageHeader title="Group classes" description="Classes running at your gym. Book a spot before it fills up." />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : classes.length === 0 ? (
        <Card><EmptyState icon={UsersRound} title="No group classes yet" description="Your gym has not scheduled any classes." /></Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const booked = cls._count?.bookings || 0;
            const full = booked >= cls.capacity;
            return (
              <li key={cls.id}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-ink">{cls.name}</h2>
                    <StatusBadge status={cls.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </div>
                  {cls.description && <p className="mt-2 text-sm text-ink-muted">{cls.description}</p>}
                  <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
                    {cls.dayOfWeek && <li className="flex items-center gap-2"><CalendarDays className="size-4" aria-hidden="true" /> {cls.dayOfWeek}</li>}
                    {cls.startTime && <li className="flex items-center gap-2"><Clock className="size-4" aria-hidden="true" /> {cls.startTime} to {cls.endTime}</li>}
                    <li className="flex items-center gap-2"><Timer className="size-4" aria-hidden="true" /> {cls.duration} minutes</li>
                    {cls.trainer && <li className="flex items-center gap-2"><User className="size-4" aria-hidden="true" /> {cls.trainer.user.username}</li>}
                  </ul>
                  <p className="mt-3 text-sm font-medium text-ink">{booked} of {cls.capacity} booked</p>
                  {cls.isActive && (
                    <Button
                      className="mt-auto w-full"
                      onClick={() => bookMutation.mutate(cls.id)}
                      disabled={full}
                      loading={bookMutation.isPending && bookMutation.variables === cls.id}
                    >
                      {full ? 'Class full' : 'Book class'}
                    </Button>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
