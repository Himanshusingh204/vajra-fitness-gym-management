import { useMemo, useState } from 'react';
import { Button, Dialog, Field, Input, Select, StatusBadge } from '../../components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Download, CheckCircle, RotateCcw } from 'lucide-react';
import api, { downloadFile } from '../../services/api';
import { localDateString } from '../../utils/format';
import { downloadCsv } from './csv';
import { useGym } from './GymContext';
import type { Member } from './types';

export default function FeesPage() {
  const { gym: branch, confirm: setConfirmAction, branchFilter } = useGym();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members', branch?.id, branchFilter],
    queryFn: () => api.get(`/members/gym/${branch?.id}`, { params: branchFilter ? { branchId: branchFilter } : undefined }).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: fees = [], isLoading: feesLoading } = useQuery({
    queryKey: ['fees', branch?.id],
    queryFn: () => api.get(`/fees/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const [feeForm, setFeeForm] = useState({ memberId: '', amount: 999, dueDate: '', status: 'PENDING', notes: '' });
  const [feeStatusFilter, setFeeStatusFilter] = useState('ALL');
  const [markPaidTarget, setMarkPaidTarget] = useState<any>(null);
  const [markPaidForm, setMarkPaidForm] = useState({ paymentMethod: 'CASH', transactionId: '', notes: '' });
  const recordFee = useMutation({
    mutationFn: (data: typeof feeForm) => api.post(`/fees/gym/${branch?.id}`, { ...data, amount: Number(data.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      setFeeForm({ memberId: '', amount: 999, dueDate: '', status: 'PENDING', notes: '' });
    },
  });
  const updateFeeStatus = useMutation({
    mutationFn: ({ id, status, paymentMethod, transactionId, notes }: { id: string; status: string; paymentMethod?: string; transactionId?: string; notes?: string }) =>
      api.put(`/fees/${id}`, { status, paymentMethod, transactionId, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
      setMarkPaidTarget(null);
      setMarkPaidForm({ paymentMethod: 'CASH', transactionId: '', notes: '' });
    },
  });
  const deleteFee = useMutation({
    mutationFn: (id: string) => api.delete(`/fees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
    },
  });
  const refundFee = useMutation({
    mutationFn: (feeId: string) => api.post('/payments/refund', { feeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
    },
  });

  const feeStats = useMemo(() => {
    const thisMonthKey = localDateString().slice(0, 7);
    return fees.reduce(
      (acc: { collected: number; collectedThisMonth: number; pending: number; overdue: number; overdueCount: number }, f: any) => {
        if (f.status === 'PAID') {
          acc.collected += f.amount;
          if (localDateString(new Date(f.paymentDate)).slice(0, 7) === thisMonthKey) acc.collectedThisMonth += f.amount;
        } else if (f.status === 'OVERDUE') {
          acc.overdue += f.amount;
          acc.overdueCount += 1;
        } else {
          acc.pending += f.amount;
        }
        return acc;
      },
      { collected: 0, collectedThisMonth: 0, pending: 0, overdue: 0, overdueCount: 0 }
    );
  }, [fees]);
  const filteredFees = useMemo(
    () => (feeStatusFilter === 'ALL' ? fees : fees.filter((f: any) => f.status === feeStatusFilter)),
    [fees, feeStatusFilter]
  );
  const exportFees = () => {
    downloadCsv(`fees-${branch?.name || 'gym'}.csv`, [
      ['Member', 'Email', 'Amount', 'Payment Date', 'Due Date', 'Status'],
      ...fees.map((f: any) => [f.member?.user?.username || '', f.member?.user?.email || '', f.amount, new Date(f.paymentDate).toLocaleDateString('en-IN'), new Date(f.dueDate).toLocaleDateString('en-IN'), f.status]),
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-card p-5 border border-line">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Collected this month</p>
          <p className="text-2xl font-extrabold tabular-nums text-success-ink">₹{feeStats.collectedThisMonth.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-surface rounded-card p-5 border border-line">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total collected</p>
          <p className="text-2xl font-extrabold tabular-nums text-success-ink">₹{feeStats.collected.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-surface rounded-card p-5 border border-line">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Pending</p>
          <p className="text-2xl font-extrabold tabular-nums text-warning-ink">₹{feeStats.pending.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-surface rounded-card p-5 border border-line">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Overdue</p>
          <p className="text-2xl font-extrabold tabular-nums text-danger-ink">₹{feeStats.overdue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-ink-muted mt-0.5">{feeStats.overdueCount} record{feeStats.overdueCount === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="bg-surface rounded-card border border-line p-6">
          <h3 className="font-bold text-lg mb-4">Record a fee</h3>
          <form
            className="grid sm:grid-cols-2 gap-4"
            onSubmit={(e) => { e.preventDefault(); if (feeForm.memberId) recordFee.mutate(feeForm); }}
          >
            <select className="input-field sm:col-span-2" value={feeForm.memberId} onChange={(e) => setFeeForm({ ...feeForm, memberId: e.target.value })} required>
              <option value="">Select member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.user?.username} ({m.user?.email})</option>
              ))}
            </select>
            <div>
              <label htmlFor="feespage-f1" className="block text-sm font-semibold text-ink mb-1.5">Amount (₹)</label>
              <input id="feespage-f1" className="input-field" type="number" min={0} value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: Number(e.target.value) })} required />
            </div>
            <div>
              <label htmlFor="feespage-f2" className="block text-sm font-semibold text-ink mb-1.5">Due date</label>
              <input id="feespage-f2" className="input-field" type="date" value={feeForm.dueDate} onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })} required />
            </div>
            <select className="input-field sm:col-span-2" value={feeForm.status} onChange={(e) => setFeeForm({ ...feeForm, status: e.target.value })}>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <div className="sm:col-span-2">
              <label htmlFor="feespage-f3" className="block text-sm font-semibold text-ink mb-1.5">Notes</label>
              <input id="feespage-f3" className="input-field" value={feeForm.notes} onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })} placeholder="Optional payment notes" maxLength={1000} />
            </div>
            <button type="submit" className="btn-primary justify-center sm:col-span-2" disabled={recordFee.isPending || !branch?.id}>
              <Plus className="w-4 h-4" /> Record Fee
            </button>
          </form>
        </div>

        <div className="bg-surface rounded-card border border-line overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex flex-wrap justify-between items-center gap-3">
            <h2 className="font-bold text-lg">Fee Records ({filteredFees.length})</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-control border border-line overflow-hidden">
                {['ALL', 'PENDING', 'PAID', 'OVERDUE'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFeeStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      feeStatusFilter === s
                        ? 'bg-accent text-on-accent'
                        : 'text-ink-muted hover:bg-surface-sunken'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <button onClick={exportFees} className="btn-outline text-sm px-3 py-1.5"><Download className="w-3.5 h-3.5" /> CSV</button>
            </div>
          </div>
          {refundFee.isError && (
            <div className="mx-6 mt-4 bg-danger-soft text-danger-ink p-3 rounded-control text-sm border border-danger">
              {(refundFee.error as any)?.response?.data?.error || 'Failed to process refund'}
            </div>
          )}
          {feesLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : filteredFees.length === 0 ? (
            <div className="p-8 text-center text-ink-muted">{fees.length === 0 ? 'No fee records yet.' : 'No fees match this filter.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken">
                  <tr>
                    {['Member', 'Amount', 'Due Date', 'Status', 'Notes', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredFees.map((f: any) => (
                    <tr key={f.id} className="hover:bg-surface-sunken">
                      <td className="px-6 py-4 font-semibold">{f.member?.user?.username || '-'}</td>
                      <td className="px-6 py-4 font-semibold text-accent-ink">₹{f.amount.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-ink-muted">{new Date(f.dueDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4"><StatusBadge status={f.status} /></td>
                      <td className="px-6 py-4 text-ink-muted max-w-[200px] truncate" title={f.notes || ''}>{f.notes || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {f.status !== 'PAID' && (
                            <button
                              onClick={() => setMarkPaidTarget(f)}
                              className="inline-flex items-center gap-1 text-success-ink hover:text-success-ink font-semibold text-xs hover:underline"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => downloadFile(`/fees/${f.id}/receipt`, `receipt-${f.id.slice(0, 8)}.pdf`)}
                            className="inline-flex items-center gap-1 text-accent-ink font-semibold text-xs hover:underline"
                          >
                            <Download className="w-3.5 h-3.5" /> Receipt
                          </button>
                          {f.status === 'PAID' && f.paymentMethod === 'ONLINE' && (
                            <button
                              onClick={() => setConfirmAction({
                                title: 'Refund payment',
                                message: `Refund ₹${f.amount.toLocaleString('en-IN')} to ${f.member?.user?.username || 'this member'} via Razorpay? This reverses real money and can't be undone.`,
                                confirmLabel: 'Refund',
                                onConfirm: () => { refundFee.mutate(f.id); setConfirmAction(null); },
                              })}
                              disabled={refundFee.isPending}
                              className="inline-flex items-center gap-1 text-ink hover:text-ink font-semibold text-xs hover:underline disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Refund
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmAction({
                              title: 'Delete fee record',
                              message: `Delete this ₹${f.amount.toLocaleString('en-IN')} fee for ${f.member?.user?.username || 'this member'}? This can't be undone.`,
                              onConfirm: () => { deleteFee.mutate(f.id); setConfirmAction(null); },
                            })}
                            aria-label={`Delete fee for ${f.member?.user?.username || 'member'}`}
                            className="inline-flex items-center gap-1 text-danger-ink hover:text-danger-ink font-semibold text-xs hover:underline"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={!!markPaidTarget}
        onClose={() => setMarkPaidTarget(null)}
        title="Mark fee as paid"
        description={markPaidTarget ? `${markPaidTarget.member?.user?.username} · ₹${markPaidTarget.amount.toLocaleString('en-IN')}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMarkPaidTarget(null)}>Cancel</Button>
            <Button
              loading={updateFeeStatus.isPending}
              onClick={() => markPaidTarget && updateFeeStatus.mutate({
                id: markPaidTarget.id,
                status: 'PAID',
                paymentMethod: markPaidForm.paymentMethod,
                transactionId: markPaidForm.transactionId || undefined,
                notes: markPaidForm.notes || undefined,
              })}
            >
              Confirm payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Payment method">
            <Select value={markPaidForm.paymentMethod} onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentMethod: e.target.value })}>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label="Transaction ID (optional)">
            <Input value={markPaidForm.transactionId} onChange={(e) => setMarkPaidForm({ ...markPaidForm, transactionId: e.target.value })} />
          </Field>
          <Field label="Notes (optional)">
            <Input value={markPaidForm.notes} onChange={(e) => setMarkPaidForm({ ...markPaidForm, notes: e.target.value })} maxLength={1000} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
