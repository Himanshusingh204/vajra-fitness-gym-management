import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Users, XCircle } from 'lucide-react';
import { listTrainers, createBooking, getMyBookings, updateBookingStatus } from '../../api/booking.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton, StatusBadge, Textarea } from '../../components/ui';
import { localDateString } from '../../utils/format';
import { useMemberProfile } from './useMemberProfile';

export default function TrainingSection() {
  const queryClient = useQueryClient();
  const { data: profile } = useMemberProfile();

  const { data: bookings, isLoading } = useQuery({ queryKey: ['myBookings'], queryFn: getMyBookings, refetchInterval: 30000 });
  const { data: trainers } = useQuery({
    queryKey: ['trainers', profile?.gymId],
    queryFn: () => listTrainers(profile?.gymId),
    enabled: !!profile?.gymId,
    refetchInterval: 60000,
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => updateBookingStatus(id, 'CANCELLED'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myBookings'] }),
  });
  const [toCancel, setToCancel] = useState<string | null>(null);

  const [form, setForm] = useState({ trainerId: '', date: '', time: '', notes: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await createBooking(form);
      setSuccess('Session requested. Your trainer will confirm it.');
      setForm({ trainerId: '', date: '', time: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create booking.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Personal training" description="Book one-to-one sessions with a trainer at your gym." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="self-start">
          <h2 className="font-semibold text-ink">Book a session</h2>
          <form onSubmit={submit} className="mt-4 space-y-4">
            {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger-ink">{error}</p>}
            {success && <p role="status" className="rounded-control bg-success-soft p-3 text-sm text-success-ink">{success}</p>}
            <Field label="Trainer" required>
              <Select required value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })}>
                <option value="">Choose a trainer</option>
                {(trainers || []).map((t: any) => (
                  <option key={t.user.id} value={t.user.id}>{t.user.username}{t.specialization ? ` (${t.specialization})` : ''}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" required>
                <Input type="date" required min={localDateString()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label="Time" required>
                <Input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes (optional)">
              <Textarea rows={2} placeholder="Focus areas, injuries" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <Button type="submit" className="w-full" loading={saving}>Request session</Button>
          </form>
        </Card>

        <div>
          <h2 className="mb-3 font-semibold text-ink">Your bookings</h2>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : bookings && bookings.length > 0 ? (
            <ul className="space-y-3">
              {bookings.map((b: any) => (
                <li key={b.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-ink">Trainer: {b.trainer?.username}</h3>
                        <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
                          <Calendar className="size-4" aria-hidden="true" /> {b.date}
                          <Clock className="ml-2 size-4" aria-hidden="true" /> {b.time}
                        </p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    {b.notes && <p className="mt-3 rounded-control bg-surface-sunken p-2 text-sm text-ink-muted">Notes: {b.notes}</p>}
                    {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                      <div className="mt-3 flex justify-end">
                        <Button variant="ghost" size="sm" icon={XCircle} disabled={cancelMutation.isPending} onClick={() => setToCancel(b.id)}>
                          Cancel session
                        </Button>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Card><EmptyState icon={Users} title="No sessions booked yet" /></Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={toCancel !== null}
        title="Cancel PT session?"
        message="This will cancel your booked personal training session. This cannot be undone."
        confirmLabel="Cancel session"
        cancelLabel="Keep it"
        loading={cancelMutation.isPending}
        onConfirm={() => toCancel && cancelMutation.mutate(toCancel, { onSuccess: () => setToCancel(null) })}
        onCancel={() => setToCancel(null)}
      />
    </>
  );
}
