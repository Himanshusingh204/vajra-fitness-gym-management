import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyOrders, requestRefund, type MyOrder } from '../../api/payment.api';
import StatusBadge from '../../components/ui/StatusBadge';
import { useNotificationStore } from '../../store/useNotificationStore';
import { formatPrice } from '../../utils/format';

const rupees = (paise: number) => formatPrice(paise / 100);

const refundLabel = (order: MyOrder) => {
  if (order.refunds.some((r) => r.status === 'REQUESTED' || r.status === 'PROCESSING')) return 'Refund requested';
  if (order.refunds.some((r) => r.status === 'REJECTED') && order.status === 'PAID') return 'Refund declined';
  return null;
};

// Plans bought online through Kavach, with a way to ask the gym for a refund.
export default function OnlineOrders() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const { data: orders = [] } = useQuery({ queryKey: ['myOrders'], queryFn: getMyOrders });
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // Errors are surfaced by the global API interceptor.
  const ask = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => requestRefund(id, reason),
    onSuccess: () => {
      addNotification('success', 'Refund requested. The gym will review it.');
      setOpenId(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
    },
  });

  const paid = orders.filter((o) => o.paidAt);
  if (paid.length === 0) return null;

  const submit = (e: FormEvent, id: string) => {
    e.preventDefault();
    ask.mutate({ id, reason: reason.trim() });
  };

  return (
    <section className="mt-10" aria-labelledby="online-orders-heading">
      <h2 id="online-orders-heading" className="text-xl font-bold dark:text-white mb-4">Bought online</h2>
      <ul className="space-y-4">
        {paid.map((o) => {
          const pending = refundLabel(o);
          const canAsk = o.status === 'PAID' && !o.refunds.some((r) => r.status === 'REQUESTED' || r.status === 'PROCESSING');
          return (
            <li key={o.id} className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold dark:text-white">{o.planSnapshot.name} · {o.gym.name}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {rupees(o.totalPaise)} paid on {new Date(o.paidAt!).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {o.status !== 'PAID' && <StatusBadge status={o.status} />}
                  {pending && <span className="text-xs font-semibold text-[var(--color-muted)]">{pending}</span>}
                  {canAsk && openId !== o.id && (
                    <button type="button" className="btn-outline min-h-11" onClick={() => { setOpenId(o.id); setReason(''); }}>
                      Request refund
                    </button>
                  )}
                </div>
              </div>
              {canAsk && openId === o.id && (
                <form className="mt-4 space-y-3" onSubmit={(e) => submit(e, o.id)}>
                  <label htmlFor={`reason-${o.id}`} className="block text-sm font-semibold dark:text-white">Why do you want a refund?</label>
                  <textarea
                    id={`reason-${o.id}`}
                    className="input-field w-full"
                    rows={3}
                    maxLength={300}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary min-h-11" disabled={ask.isPending}>
                      {ask.isPending ? 'Sending…' : `Ask for ${rupees(o.totalPaise)} back`}
                    </button>
                    <button type="button" className="btn-outline min-h-11" onClick={() => setOpenId(null)}>Cancel</button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
