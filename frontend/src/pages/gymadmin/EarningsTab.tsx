import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { decideRefund, getOwnerEarnings, type LedgerRow } from '../../api/payment.api';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable, { type Column } from '../../components/ui/DataTable';
import type { TableState } from '../../components/ui/useTableQuery';
import { useNotificationStore } from '../../store/useNotificationStore';
import { formatPrice } from '../../utils/format';

const rupees = (paise: number) => formatPrice(paise / 100);
const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

const LEDGER_LABELS: Record<string, string> = {
  'ORDER:GYM_PAYABLE': 'Plan sold',
  'REFUND:GYM_PAYABLE': 'Refund taken back',
  'PAYOUT:PAYOUT': 'Sent to your bank',
};

const ledgerColumns: Column<LedgerRow>[] = [
  { key: 'createdAt', header: 'Date', cell: (r) => date(r.createdAt), sortValue: (r) => r.createdAt },
  { key: 'entry', header: 'Entry', cell: (r) => LEDGER_LABELS[`${r.sourceType}:${r.account}`] ?? 'Adjustment' },
  { key: 'gym', header: 'Gym', cell: (r) => r.gym.name },
  {
    key: 'amountPaise',
    header: 'Amount',
    align: 'right',
    sortValue: (r) => r.amountPaise,
    cell: (r) => <span className={r.amountPaise < 0 ? 'text-red-600' : 'dark:text-white'}>{rupees(r.amountPaise)}</span>,
  },
];

const card = 'bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]';

export default function EarningsTab() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['ownerEarnings'], queryFn: getOwnerEarnings });
  const [ledgerState, setLedgerState] = useState<TableState>({ page: 1, pageSize: 20, sort: null, search: '', filters: {} });

  // Errors are surfaced by the global API interceptor.
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) => decideRefund(id, decision),
    onSuccess: (refund) => {
      addNotification('success', refund.status === 'REJECTED' ? 'Refund declined.' : 'Refund sent to the member.');
      queryClient.invalidateQueries({ queryKey: ['ownerEarnings'] });
    },
    onError: () => { queryClient.invalidateQueries({ queryKey: ['ownerEarnings'] }); },
  });

  if (isLoading) return <div className="h-28 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse" aria-busy="true" />;

  if (isError) return <div role="alert" className={`${card} p-5`}>Could not load earnings. <button type="button" className="underline" onClick={() => refetch()}>Try again</button></div>;

  if (!data?.paidOrders) {
    return (
      <div className={card}>
        <EmptyState icon={<Banknote className="h-8 w-8" />} title="No online sales yet" hint="Plans members buy through Kavach show here with the commission taken and what you are owed. Cash and offline fees stay under Fees and Reports." />
      </div>
    );
  }

  const stats = [
    ['Balance', data.balancePaise],
    ['Ready for payout', data.availablePaise],
    ['Members paid', data.grossPaise],
    ['Kavach commission + GST', data.commissionPaise + data.commissionGstPaise],
  ] as const;

  const pendingRefunds = data.refunds.filter((r) => r.status === 'REQUESTED');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(([label, paise]) => (
          <div key={label} className={`${card} p-5`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-extrabold dark:text-white">{rupees(paise)}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-[var(--color-muted)]">
        {data.availablePaise >= data.minPayoutPaise
          ? `${rupees(data.availablePaise)} goes to your bank in the next weekly payout.`
          : `Sales are held for 7 days, then paid out weekly once at least ${rupees(data.minPayoutPaise)} is ready.`}
      </p>

      {data.refunds.length > 0 && (
        <section className={card} aria-labelledby="refunds-heading">
          <h2 id="refunds-heading" className="px-5 py-4 border-b border-[var(--color-border)] font-bold dark:text-white">
            Refund requests{pendingRefunds.length > 0 && ` (${pendingRefunds.length} waiting)`}
          </h2>
          <ul>
            {data.refunds.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold dark:text-white">
                    {rupees(r.amountPaise)} of {rupees(r.order.totalPaise)} · {r.order.planSnapshot.name}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {r.order.memberUser.username} · {date(r.createdAt)}{r.reason && ` · "${r.reason}"`}
                  </p>
                </div>
                {r.status === 'REQUESTED' ? (
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary min-h-11" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, decision: 'APPROVED' })}>
                      Refund
                    </button>
                    <button type="button" className="btn-outline min-h-11" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, decision: 'REJECTED' })}>
                      Decline
                    </button>
                  </div>
                ) : (
                  <StatusBadge status={r.status} tone={r.status === 'PROCESSED' ? 'success' : undefined} label={r.status === 'PROCESSED' ? 'Refunded' : undefined} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--color-muted)] border-b border-[var(--color-border)]">
              <th className="p-4 font-semibold">Plan</th>
              <th className="p-4 font-semibold">Paid on</th>
              <th className="p-4 font-semibold text-right">Member paid</th>
              <th className="p-4 font-semibold text-right">Your share</th>
            </tr>
          </thead>
          <tbody>
            {data.recentOrders.map((o) => (
              <tr key={o.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="p-4 dark:text-white">
                  {o.planSnapshot.name}
                  {o.status !== 'PAID' && <StatusBadge status={o.status} className="ml-2" />}
                </td>
                <td className="p-4 text-[var(--color-muted)]">{o.paidAt ? date(o.paidAt) : '-'}</td>
                <td className="p-4 text-right dark:text-white">{rupees(o.totalPaise)}</td>
                <td className="p-4 text-right font-semibold dark:text-white">{rupees(o.gymNetPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.payouts.length > 0 && (
        <section className={card} aria-labelledby="payouts-heading">
          <h2 id="payouts-heading" className="px-5 py-4 border-b border-[var(--color-border)] font-bold dark:text-white">Payouts</h2>
          <ul>
            {data.payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)] last:border-0">
                <span className="text-sm text-[var(--color-muted)]">{date(p.createdAt)}</span>
                <span className="font-semibold dark:text-white">{rupees(p.amountPaise)}</span>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="ledger-heading" className="space-y-3">
        <h2 id="ledger-heading" className="font-bold dark:text-white">Statement</h2>
        <DataTable
          label="Earnings statement"
          columns={ledgerColumns}
          rows={data.ledger}
          rowKey={(r) => r.id}
          state={ledgerState}
          onChange={(patch) => setLedgerState((s) => ({ ...s, ...patch }))}
          emptyTitle="Nothing on the statement yet."
        />
      </section>
    </div>
  );
}
