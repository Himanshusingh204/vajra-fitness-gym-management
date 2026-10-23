import { useMemo, useState } from 'react';
import { Button, Dialog, Field, Input, Select } from '../../components/ui';
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
    PAID: 'bg-success-soft text-success-ink',
    PENDING: 'bg-warning-soft text-warning-ink',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${map[status] || 'bg-surface-sunken text-ink-muted'}`}>
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
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent-ink" /> Payroll
        </h2>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-ink-muted" aria-hidden="true" />
          <label htmlFor="payroll-year" className="sr-only">Year</label>
          <select
            id="payroll-year"
            className="input-field w-auto py-1.5"
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
            <div key={i} className="h-28 bg-surface-sunken rounded-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface rounded-card p-5 border border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total paid</p>
            <p className="text-2xl font-extrabold tabular-nums text-success-ink">₹{(summary?.totalPaid ?? 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-surface rounded-card p-5 border border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total pending</p>
            <p className="text-2xl font-extrabold tabular-nums text-warning-ink">₹{(summary?.totalPending ?? 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-surface rounded-card p-5 border border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total payslips</p>
            <p className="text-2xl font-extrabold tabular-nums text-ink">{summary?.totalPayslips ?? 0}</p>
          </div>
          <div className="bg-surface rounded-card p-5 border border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Monthly totals</p>
            {summary && summary.monthlyTotals.some((m) => m.total > 0) ? (
              <div className="flex items-end gap-1 h-12">
                {summary.monthlyTotals.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full" title={`${MONTH_NAMES[m.month - 1]}: ₹${m.total.toLocaleString('en-IN')}`}>
                    <div
                      className="w-full rounded-sm bg-accent"
                      style={{ height: `${Math.max(2, Math.round((m.total / maxMonthlyTotal) * 100))}%`, opacity: m.total > 0 ? 1 : 0.15 }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No payroll activity in {year} yet.</p>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Create Payslip */}
        <div className="bg-surface rounded-card border border-line p-6">
          <h3 className="font-bold text-lg mb-4">Create payslip</h3>
          {createMutation.isError && (
            <div className="mb-4 bg-danger-soft text-danger-ink p-3 rounded-control text-sm border border-danger">
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
              <label htmlFor="payroll-employee" className="block text-sm font-semibold text-ink mb-1.5">Employee</label>
              <select
                id="payroll-employee"
                className="input-field"
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
              <label htmlFor="payroll-month" className="block text-sm font-semibold text-ink mb-1.5">Month</label>
              <select
                id="payroll-month"
                className="input-field"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="payroll-form-year" className="block text-sm font-semibold text-ink mb-1.5">Year</label>
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
              <label htmlFor="payroll-basic" className="block text-sm font-semibold text-ink mb-1.5">Basic Salary (₹)</label>
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
              <label htmlFor="payroll-bonuses" className="block text-sm font-semibold text-ink mb-1.5">Bonuses (₹)</label>
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
              <label htmlFor="payroll-deductions" className="block text-sm font-semibold text-ink mb-1.5">Deductions (₹)</label>
              <input
                id="payroll-deductions"
                className="input-field"
                type="number"
                min={0}
                value={form.deductions}
                onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between rounded-control bg-surface-sunken px-4 py-2.5 text-sm">
              <span className="font-semibold text-ink-muted">Net Pay (preview)</span>
              <span className="font-extrabold tabular-nums text-accent-ink">₹{netPayPreview.toLocaleString('en-IN')}</span>
            </div>
            <button type="submit" className="btn-primary justify-center sm:col-span-2" disabled={createMutation.isPending || !gymId || !form.userId}>
              <Plus className="w-4 h-4" /> {createMutation.isPending ? 'Creating…' : 'Create Payslip'}
            </button>
          </form>
        </div>

        {/* Payslips table */}
        <div className="bg-surface rounded-card border border-line overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex flex-wrap justify-between items-center gap-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Users className="w-4 h-4 text-ink-muted" aria-hidden="true" /> Payslips ({payslips.length})
            </h2>
            <div className="flex rounded-control border border-line overflow-hidden">
              {['ALL', 'PENDING', 'PAID'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    statusFilter === s
                      ? 'bg-accent text-on-accent'
                      : 'text-ink-muted hover:bg-surface-sunken'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {markPaidMutation.isError && (
            <div className="mx-6 mt-4 bg-danger-soft text-danger-ink p-3 rounded-control text-sm border border-danger">
              {(markPaidMutation.error as any)?.response?.data?.error || 'Failed to update payslip'}
            </div>
          )}
          {deleteMutation.isError && (
            <div className="mx-6 mt-4 bg-danger-soft text-danger-ink p-3 rounded-control text-sm border border-danger">
              {(deleteMutation.error as any)?.response?.data?.error || 'Failed to delete payslip'}
            </div>
          )}

          {payslipsLoading ? (
            <div className="p-8 text-center text-ink-muted">Loading…</div>
          ) : payslips.length === 0 ? (
            <div className="p-8 text-center text-ink-muted">
              {statusFilter === 'ALL' ? 'No payslips yet.' : 'No payslips match this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken">
                  <tr>
                    {['Employee', 'Period', 'Basic', 'Bonuses', 'Deductions', 'Net Pay', 'Status', 'Paid Date', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {payslips.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-sunken">
                      <td className="px-4 py-4">
                        <div className="font-semibold">{p.user?.username || '-'}</div>
                        <div className="text-xs text-ink-muted">{p.user?.email}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-ink">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-4 tabular-nums text-ink">₹{p.basicSalary.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 tabular-nums text-success-ink">₹{p.bonuses.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 tabular-nums text-danger-ink">₹{p.deductions.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 tabular-nums font-semibold text-accent-ink">₹{p.netPay.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4">{payslipStatusBadge(p.status)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-ink-muted">
                        {p.paidDate ? new Date(p.paidDate).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {p.status !== 'PAID' && (
                            <button
                              onClick={() => setMarkPaidTarget(p)}
                              aria-label={`Mark payslip for ${p.user?.username || 'employee'} as paid`}
                              className="inline-flex items-center gap-1 text-success-ink hover:text-success-ink font-semibold text-xs hover:underline"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(p)}
                            aria-label={`Delete payslip for ${p.user?.username || 'employee'}`}
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
        title="Mark payslip as paid"
        description={markPaidTarget ? `${markPaidTarget.user?.username} · ${MONTH_NAMES[markPaidTarget.month - 1]} ${markPaidTarget.year} · ₹${markPaidTarget.netPay.toLocaleString('en-IN')}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMarkPaidTarget(null)}>Cancel</Button>
            <Button
              loading={markPaidMutation.isPending}
              onClick={() =>
                markPaidTarget && markPaidMutation.mutate({
                  id: markPaidTarget.id,
                  paymentMethod: markPaidForm.paymentMethod,
                  transactionId: markPaidForm.transactionId || undefined,
                })
              }
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
        </div>
      </Dialog>

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
