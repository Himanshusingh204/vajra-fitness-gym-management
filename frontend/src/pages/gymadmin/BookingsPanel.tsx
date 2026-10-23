import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';
import { getGymBookings, updateBookingStatus } from '../../api/booking.api';
import { useGym } from './GymContext';

export default function BookingsPanel() {
  const { gym: branch } = useGym();
  const qc = useQueryClient();
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['gymBookings', branch?.id],
    queryFn: () => getGymBookings(branch?.id),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const updateBookingStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateBookingStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gymBookings', branch?.id] }),
  });

  return (
    <div className="bg-surface rounded-card border border-line overflow-hidden">
      <div className="px-6 py-4 border-b border-line">
        <h2 className="font-bold text-lg">PT Bookings ({bookings.length})</h2>
      </div>
      {bookingsLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : bookings.length === 0 ? (
        <div className="p-8 text-center text-ink-muted">No bookings yet.</div>
      ) : (
        <div className="divide-y divide-line">
          {bookings.map((b: any) => (
            <div key={b.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="font-bold">{b.user?.username}</p>
                <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {b.date} · {b.time} · Trainer: {b.trainer?.username}
                </p>
                {b.notes && <p className="text-xs text-ink-muted mt-0.5">Notes: {b.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  b.status === 'PENDING' ? 'bg-warning-soft text-warning-ink' :
                  b.status === 'CONFIRMED' ? 'bg-info-soft text-info-ink' :
                  b.status === 'COMPLETED' ? 'bg-success-soft text-success-ink' :
                  'bg-danger-soft text-danger-ink'
                }`}>{b.status}</span>
                {b.status === 'PENDING' && (
                  <>
                    <button onClick={() => updateBookingStatusMut.mutate({ id: b.id, status: 'CONFIRMED' })} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Confirm
                    </button>
                    <button onClick={() => updateBookingStatusMut.mutate({ id: b.id, status: 'CANCELLED' })} className="text-danger-ink hover:text-danger-ink text-xs font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </>
                )}
                {b.status === 'CONFIRMED' && (
                  <button onClick={() => updateBookingStatusMut.mutate({ id: b.id, status: 'COMPLETED' })} className="bg-success text-on-accent rounded font-bold text-xs px-3 py-1.5 transition-colors">
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
