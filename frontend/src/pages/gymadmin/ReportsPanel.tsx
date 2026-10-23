import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import api from '../../services/api';
import { localDateString } from '../../utils/format';
import { downloadCsv } from './csv';
import { useGym } from './GymContext';
import type { Member, Plan } from './types';

export default function ReportsPanel() {
  const { gym: branch, branchFilter } = useGym();
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members', branch?.id, branchFilter],
    queryFn: () => api.get(`/members/gym/${branch?.id}`, { params: branchFilter ? { branchId: branchFilter } : undefined }).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['plans', branch?.id],
    queryFn: () => api.get(`/plans/admin/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: fees = [] } = useQuery({
    queryKey: ['fees', branch?.id],
    queryFn: () => api.get(`/fees/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const monthlyRows = useMemo(() => {
    const monthly: Record<string, { collected: number; outstanding: number; count: number }> = {};
    fees.forEach((f: any) => {
      const key = localDateString(new Date(f.paymentDate)).slice(0, 7);
      if (!monthly[key]) monthly[key] = { collected: 0, outstanding: 0, count: 0 };
      monthly[key].count += 1;
      if (f.status === 'PAID') monthly[key].collected += f.amount;
      else monthly[key].outstanding += f.amount;
    });
    return Object.entries(monthly).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [fees]);
  const monthLabel = (key: string) => {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };
  const exportFees = () => {
    downloadCsv(`fees-${branch?.name || 'gym'}.csv`, [
      ['Member', 'Email', 'Amount', 'Payment Date', 'Due Date', 'Status'],
      ...fees.map((f: any) => [f.member?.user?.username || '', f.member?.user?.email || '', f.amount, new Date(f.paymentDate).toLocaleDateString('en-IN'), new Date(f.dueDate).toLocaleDateString('en-IN'), f.status]),
    ]);
  };
  const exportMembers = () => {
    downloadCsv(`members-${branch?.name || 'gym'}.csv`, [
      ['Name', 'Email', 'Phone', 'Plan', 'Joined', 'Status'],
      ...members.map((m) => [m.user?.username || '', m.user?.email || '', m.user?.phone || '', m.membershipPlan?.name || '-', new Date(m.joiningDate).toLocaleDateString('en-IN'), m.status]),
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-card border border-line p-8">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="font-bold text-lg">Revenue and growth</h2>
          <div className="flex gap-2">
            <button onClick={exportMembers} className="btn-outline px-4 py-2 text-sm"><FileDown className="w-4 h-4" /> Members CSV</button>
            <button onClick={exportFees} className="btn-outline px-4 py-2 text-sm"><FileDown className="w-4 h-4" /> Fees CSV</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Collected</p>
            <p className="text-2xl font-extrabold text-success-ink">₹{fees.filter((f: any) => f.status === 'PAID').reduce((s: number, f: any) => s + f.amount, 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Outstanding</p>
            <p className="text-2xl font-extrabold text-warning-ink">₹{fees.filter((f: any) => f.status !== 'PAID').reduce((s: number, f: any) => s + f.amount, 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Members</p>
            <p className="text-2xl font-extrabold text-accent-ink">{members.length}</p>
          </div>
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Active plans</p>
            <p className="text-2xl font-extrabold text-info-ink">{plans.filter((p) => p.isActive).length}</p>
          </div>
        </div>

        <h3 className="font-bold text-ink mb-3">Monthly fee summary</h3>
        {monthlyRows.length === 0 ? (
          <div className="h-32 bg-surface-sunken rounded-control border border-dashed border-line flex items-center justify-center text-ink-muted">
            No fee records to chart yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken">
                <tr>
                  {['Month', 'Records', 'Collected', 'Outstanding'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {monthlyRows.map(([key, m]) => (
                  <tr key={key} className="hover:bg-surface-sunken">
                    <td className="px-6 py-3 font-semibold">{monthLabel(key)}</td>
                    <td className="px-6 py-3 text-ink-muted">{m.count}</td>
                    <td className="px-6 py-3 font-semibold text-success-ink">₹{m.collected.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3 text-warning-ink">₹{m.outstanding.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
