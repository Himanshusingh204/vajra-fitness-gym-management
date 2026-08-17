import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, Plus, CheckCircle, Trash2, Calendar, Users } from 'lucide-react';
import api from '../../services/api';
import {
  getPayslips,
  createPayslip,
  updatePayslipStatus,
  deletePayslip,
  getPayslipSummary,
  type Payslip,
  type PayslipSummary,
} from '../../api/payslip.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type StaffEntry = { id: string; user: { id: string; username: string; email: string } };
type StaffResponse = { trainers: StaffEntry[]; staff: StaffEntry[] };

const payslipStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    PAID: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const emptyForm = (currentYear: number) => ({
  userId: '',
  month: new Date().getMonth() + 1,
  year: currentYear,
  basicSalary: 0,
  bonuses: 0,
  deductions: 0,
});

export default function PayrollTab({ gymId }: { gymId: string }) {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [form, setForm] = useState(emptyForm(currentYear));
  const [markPaidTarget, setMarkPaidTarget] = useState<Payslip | null>(null);
  const [markPaidForm, setMarkPaidForm] = useState({ paymentMethod: 'CASH', transactionId: '' });
  const [deleteTarget, setDeleteTarget] = useState<Payslip | null>(null);

  const yearOptions = useMemo(
    () => Array.from({ length: 7 }, (_, i) => currentYear + 1 - i),
    [currentYear],
  );

  const { data: summary, isLoading: summaryLoading } = useQuery<PayslipSummary>({
    queryKey: ['payslip-summary', gymId, year],
    queryFn: () => getPayslipSummary(gymId, year),
    enabled: !!gymId,
  });

  const { data: payslips = [], isLoading: payslipsLoading } = useQuery<Payslip[]>({
    queryKey: ['payslips', gymId, year, statusFilter],
    queryFn: () => getPayslips(gymId, { year, ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}) }),
    enabled: !!gymId,
  });

  const { data: staffData, isLoading: staffLoading } = useQuery<StaffResponse>({
    queryKey: ['staff', gymId],
    queryFn: () => api.get(`/staff/gym/${gymId}`).then((r) => r.data),
    enabled: !!gymId,
  });

  const employees = useMemo(
    () => ({
      staff: staffData?.staff ?? [],
      trainers: staffData?.trainers ?? [],
    }),
    [staffData],
  );

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      createPayslip(gymId, {
        userId: data.userId,
        month: data.month,
        year: data.year,
        basicSalary: Number(data.basicSalary),
        bonuses: Number(data.bonuses) || 0,
        deductions: Number(data.deductions) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payslips', gymId] });
      qc.invalidateQueries({ queryKey: ['payslip-summary', gymId] });
      setForm(emptyForm(currentYear));
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, paymentMethod, transactionId }: { id: string; paymentMethod: string; transactionId?: string }) =>
      updatePayslipStatus(id, { status: 'PAID', paymentMethod, transactionId: transactionId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payslips', gymId] });
      qc.invalidateQueries({ queryKey: ['payslip-summary', gymId] });
      setMarkPaidTarget(null);
      setMarkPaidForm({ paymentMethod: 'CASH', transactionId: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePayslip(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payslips', gymId] });
      qc.invalidateQueries({ queryKey: ['payslip-summary', gymId] });
      setDeleteTarget(null);
    },
  });

  const netPayPreview = (Number(form.basicSalary) || 0) + (Number(form.bonuses) || 0) - (Number(form.deductions) || 0);
  const maxMonthlyTotal = Math.max(1, ...(summary?.monthlyTotals?.map((m) => m.total) || [0]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-lg dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[var(--color-primary)]" /> Payroll
        </h2>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--color-muted)]" aria-hidden="true" />
          <label htmlFor="payroll-year" className="sr-only">Year</label>
          <select
            id="payroll-year"
            className="input-field bg-white! dark:bg-[#1a1a1a]! w-auto py-1.5"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Total Paid</p>
            <p className="text-2xl font-extrabold tabular-nums text-green-600">₹{(summary?.totalPaid ?? 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Total Pending</p>
            <p className="text-2xl font-extrabold tabular-nums text-amber-500">₹{(summary?.totalPending ?? 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Total Payslips</p>
            <p className="text-2xl font-extrabold tabular-nums text-[var(--color-deepgray)] dark:text-white">{summary?.totalPayslips ?? 0}</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2">Monthly Totals</p>
            {summary && summary.monthlyTotals.some((m) => m.total > 0) ? (
              <div className="flex items-end gap-1 h-12">
                {summary.monthlyTotals.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full" title={`${MONTH_NAMES[m.month - 1]}: ₹${m.total.toLocaleString('en-IN')}`}>
                    <div
                      className="w-full rounded-sm bg-[var(--color-primary)]"
                      style={{ height: `${Math.max(2, Math.round((m.total / maxMonthlyTotal) * 100))}%`, opacity: m.total > 0 ? 1 : 0.15 }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No payroll activity in {year} yet.</p>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Create Payslip */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
          <h3 className="font-bold text-lg dark:text-white mb-4">Create Payslip</h3>
          {createMutation.isError && (
            <div className="mb-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm border border-red-200 dark:border-red-500/20">
              {(createMutation.error as any)?.response?.data?.error || 'Failed to create payslip'}
            </div>
          )}
          <form
            className="grid sm:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.userId) createMutation.mutate(form);
            }}
          >
            <div className="sm:col-span-2">
              <label htmlFor="payroll-employee" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Employee</label>
              <select
                id="payroll-employee"
                className="input-field bg-white! dark:bg-[#1a1a1a]!"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                required
              >
                <option value="">{staffLoading ? 'Loading employees…' : 'Select employee…'}</option>
                {employees.staff.length > 0 && (
                  <optgroup label="Staff">
                    {employees.staff.map((s) => (
                      <option key={s.user.id} value={s.user.id}>{s.user.username} ({s.user.email})</option>
                    ))}
                  </optgroup>
                )}
                {employees.trainers.length > 0 && (
                  <optgroup label="Trainers">
                    {employees.trainers.map((t) => (
                      <option key={t.user.id} value={t.user.id}>{t.user.username} ({t.user.email})</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="payroll-month" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Month</label>
              <select
                id="payroll-month"
                className="input-field bg-white! dark:bg-[#1a1a1a]!"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="payroll-form-year" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Year</label>
              <input
                id="payroll-form-year"
                className="input-field"
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label htmlFor="payroll-basic" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Basic Salary (₹)</label>
              <input
                id="payroll-basic"
                className="input-field"
                type="number"
                min={0}
                value={form.basicSalary}
                onChange={(e) => setForm({ ...form, basicSalary: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label htmlFor="payroll-bonuses" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Bonuses (₹)</label>
              <input
                id="payroll-bonuses"
                className="input-field"
                type="number"
                min={0}
                value={form.bonuses}
                onChange={(e) => setForm({ ...form, bonuses: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="payroll-deductions" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Deductions (₹)</label>
              <input
                id="payroll-deductions"
                className="input-field"
                type="number"
                min={0}
                value={form.deductions}
                onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-[var(--color-base)] dark:bg-white/5 px-4 py-2.5 text-sm">
              <span className="font-semibold text-[var(--color-muted)]">Net Pay (preview)</span>
              <span className="font-extrabold tabular-nums text-[var(--color-primary)]">₹{netPayPreview.toLocaleString('en-IN')}</span>
            </div>
            <button type="submit" className="btn-primary justify-center sm:col-span-2" disabled={createMutation.isPending || !gymId || !form.userId}>
              <Plus className="w-4 h-4" /> {createMutation.isPending ? 'Creating…' : 'Create Payslip'}
            </button>
          </form>
        </div>

        {/* Payslips table */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] flex flex-wrap justify-between items-center gap-3">
            <h2 className="font-bold text-lg dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-muted)]" aria-hidden="true" /> Payslips ({payslips.length})
            </h2>
            <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
              {['ALL', 'PENDING', 'PAID'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    statusFilter === s
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-muted)] hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {markPaidMutation.isError && (
            <div className="mx-6 mt-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm border border-red-200 dark:border-red-500/20">
              {(markPaidMutation.error as any)?.response?.data?.error || 'Failed to update payslip'}
            </div>
          )}
          {deleteMutation.isError && (
            <div className="mx-6 mt-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm border border-red-200 dark:border-red-500/20">
              {(deleteMutation.error as any)?.response?.data?.error || 'Failed to delete payslip'}
            </div>
          )}

          {payslipsLoading ? (
            <div className="p-8 text-center text-[var(--color-muted)]">Loading…</div>
          ) : payslips.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-muted)]">
              {statusFilter === 'ALL' ? 'No payslips yet.' : 'No payslips match this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    {['Employee', 'Period', 'Basic', 'Bonuses', 'Deductions', 'Net Pay', 'Status', 'Paid Date', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {payslips.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-4">
                        <div className="font-semibold dark:text-white">{p.user?.username || '—'}</div>
                        <div className="text-xs text-[var(--color-muted)]">{p.user?.email}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-[var(--color-charcoal)]">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-4 tabular-nums text-[var(--color-charcoal)]">₹{p.basicSalary.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 tabular-nums text-green-600">₹{p.bonuses.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 tabular-nums text-red-500">₹{p.deductions.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 tabular-nums font-semibold text-[var(--color-primary)]">₹{p.netPay.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4">{payslipStatusBadge(p.status)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-[var(--color-muted)]">
                        {p.paidDate ? new Date(p.paidDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {p.status !== 'PAID' && (
                            <button
                              onClick={() => setMarkPaidTarget(p)}
                              aria-label={`Mark payslip for ${p.user?.username || 'employee'} as paid`}
                              className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-semibold text-xs hover:underline"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(p)}
                            aria-label={`Delete payslip for ${p.user?.username || 'employee'}`}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-xs hover:underline"
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

      {/* Mark Paid modal */}
      {markPaidTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setMarkPaidTarget(null)}>
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg dark:text-white mb-1">Mark Payslip as Paid</h3>
            <p className="text-sm text-[var(--color-muted)] mb-4">
              {markPaidTarget.user?.username} · {MONTH_NAMES[markPaidTarget.month - 1]} {markPaidTarget.year} · ₹{markPaidTarget.netPay.toLocaleString('en-IN')}
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="markpaid-method" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Payment Method</label>
                <select
                  id="markpaid-method"
                  className="input-field bg-white! dark:bg-[#1a1a1a]!"
                  value={markPaidForm.paymentMethod}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentMethod: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="markpaid-txn" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Transaction ID (optional)</label>
                <input
                  id="markpaid-txn"
                  className="input-field"
                  value={markPaidForm.transactionId}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, transactionId: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-primary flex-1 justify-center"
                  disabled={markPaidMutation.isPending}
                  onClick={() =>
                    markPaidMutation.mutate({
                      id: markPaidTarget.id,
                      paymentMethod: markPaidForm.paymentMethod,
                      transactionId: markPaidForm.transactionId || undefined,
                    })
                  }
                >
                  {markPaidMutation.isPending ? 'Saving…' : 'Confirm Payment'}
                </button>
                <button className="btn-outline px-5" onClick={() => setMarkPaidTarget(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete payslip"
        message={
          deleteTarget
            ? `Delete the ${MONTH_NAMES[deleteTarget.month - 1]} ${deleteTarget.year} payslip for ${deleteTarget.user?.username || 'this employee'} (₹${deleteTarget.netPay.toLocaleString('en-IN')})? This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
