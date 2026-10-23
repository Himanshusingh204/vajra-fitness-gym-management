import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CalendarClock, CheckCircle, Clock, XCircle } from 'lucide-react';
import { updateBookingStatus } from '../../api/booking.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button, Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { localDateString } from '../../utils/format';
import { useTrainerBookings } from './useTrainer';

export default function SessionsSection() {
  const queryClient = useQueryClient();
  const { data: bookings, isLoading } = useTrainerBookings(true);
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateBookingStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainerBookings'] }),
  });
  const [pending, setPending] = useState<{ id: string; kind: 'decline' | 'cancel' } | null>(null);
  const today = localDateString();

  return (
    <>
      <PageHeader title="Sessions" description="One-to-one session requests from members." />
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !bookings || bookings.length === 0 ? (
        <Card><EmptyState icon={CalendarClock} title="No sessions booked yet" /></Card>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b: any) => (
            <li key={b.id}>
              <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-ink">{b.user?.username}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-ink-muted">
                    <Calendar className="size-4" aria-hidden="true" /> {b.date}
                    <Clock className="ml-2 size-4" aria-hidden="true" /> {b.time}
                    {b.date === today && <span className="ml-2 font-semibold text-accent-ink">Today</span>}
                  </p>
                  {b.notes && <p className="mt-2 break-words rounded-control bg-surface-sunken p-2 text-sm text-ink-muted">Notes: {b.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={b.status} />
                  {b.status === 'PENDING' && (
                    <>
                      <Button size="sm" icon={CheckCircle} disabled={mutation.isPending} onClick={() => mutation.mutate({ id: b.id, status: 'CONFIRMED' })}>Confirm</Button>
                      <Button size="sm" variant="ghost" icon={XCircle} disabled={mutation.isPending} onClick={() => setPending({ id: b.id, kind: 'decline' })}>Decline</Button>
                    </>
                  )}
                  {b.status === 'CONFIRMED' && (
                    <>
                      <Button size="sm" icon={CheckCircle} disabled={mutation.isPending} onClick={() => mutation.mutate({ id: b.id, status: 'COMPLETED' })}>Mark complete</Button>
                      <Button size="sm" variant="ghost" icon={XCircle} disabled={mutation.isPending} onClick={() => setPending({ id: b.id, kind: 'cancel' })}>Cancel</Button>
                    </>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'decline' ? 'Decline booking?' : 'Cancel booking?'}
        message={
          pending?.kind === 'decline'
            ? 'This will decline the session request. The member will need to book again if they still want a session.'
            : 'This will cancel the confirmed session. The member will be notified that the session no longer stands.'
        }
        confirmLabel={pending?.kind === 'decline' ? 'Decline booking' : 'Cancel booking'}
        loading={mutation.isPending}
        onConfirm={() => pending && mutation.mutate({ id: pending.id, status: 'CANCELLED' }, { onSettled: () => setPending(null) })}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
