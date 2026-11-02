import { useQuery } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { getOwnerEarnings } from '../../api/payment.api';
import EmptyState from '../../components/ui/EmptyState';
import { formatPrice } from '../../utils/format';

const rupees = (paise: number) => formatPrice(paise / 100);

export default function EarningsTab() {
  const { data, isLoading } = useQuery({ queryKey: ['ownerEarnings'], queryFn: getOwnerEarnings });

  if (isLoading) return <div className="h-28 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse" aria-busy="true" />;

  if (!data?.paidOrders) {
    return (
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
        <EmptyState icon={<Banknote className="h-8 w-8" />} title="No online sales yet" hint="Plans members buy through Kavach show here with the commission taken and what you are owed. Cash and offline fees stay under Fees and Reports." />
      </div>
    );
  }

  const stats = [
    ['Members paid', data.grossPaise],
    ['Kavach commission', data.commissionPaise],
    ['GST on commission', data.commissionGstPaise],
    ['Owed to you', data.payablePaise],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(([label, paise]) => (
          <div key={label} className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-extrabold dark:text-white">{rupees(paise)}</p>
          </div>
        ))}
      </div>
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-x-auto">
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
                <td className="p-4 dark:text-white">{o.planSnapshot.name}</td>
                <td className="p-4 text-[var(--color-muted)]">{o.paidAt ? new Date(o.paidAt).toLocaleDateString('en-IN') : '-'}</td>
                <td className="p-4 text-right dark:text-white">{rupees(o.totalPaise)}</td>
                <td className="p-4 text-right font-semibold dark:text-white">{rupees(o.gymNetPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
