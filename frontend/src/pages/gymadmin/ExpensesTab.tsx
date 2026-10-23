import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Receipt, TrendingDown, Plus, Trash2, Download, RotateCcw } from 'lucide-react';
import { getExpenses, recordExpense, deleteExpense, getExpenseSummary, type Expense } from '../../api/expense.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { localDateString } from '../../utils/format';

const CATEGORIES = [
  'RENT', 'ELECTRICITY', 'INTERNET', 'SALARIES', 'MAINTENANCE',
  'EQUIPMENT', 'MARKETING', 'CLEANING', 'SOFTWARE', 'MISC',
] as const;

const CATEGORY_STYLES: Record<string, string> = {
  RENT: 'bg-info-soft text-info-ink',
  ELECTRICITY: 'bg-warning-soft text-warning-ink',
  INTERNET: 'bg-info-soft text-info-ink',
  SALARIES: 'bg-surface-sunken text-ink',
  MAINTENANCE: 'bg-warning-soft text-warning-ink',
  EQUIPMENT: 'bg-info-soft text-info-ink',
  MARKETING: 'bg-surface-sunken text-ink',
  CLEANING: 'bg-success-soft text-success-ink',
  SOFTWARE: 'bg-surface-sunken text-ink-muted',
  MISC: 'bg-surface-sunken text-ink-muted',
};

const categoryLabel = (category: string) => category.charAt(0) + category.slice(1).toLowerCase();

interface CategorySummaryRow {
  category: string;
  _sum: { amount: number | null };
  _count: number;
}

interface ExpenseSummary {
  monthTotal: number;
  allTimeTotal: number;
  byCategory: CategorySummaryRow[];
}

const todayStr = () => localDateString();

const emptyForm = {
  category: 'RENT' as string,
  description: '',
  amount: '',
  date: todayStr(),
  isRecurring: false,
  receiptUrl: '',
  notes: '',
};

export default function ExpensesTab({ gymId }: { gymId: string }) {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery<ExpenseSummary>({
    queryKey: ['expense-summary', gymId],
    queryFn: () => getExpenseSummary(gymId),
    enabled: !!gymId,
    refetchInterval: 30000,
  });

  const { data, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', gymId, categoryFilter],
    queryFn: () => getExpenses(gymId, categoryFilter !== 'ALL' ? { category: categoryFilter } : undefined),
    enabled: !!gymId,
    refetchInterval: 30000,
  });
  const expenses = data?.expenses ?? [];

  const recordMut = useMutation({
    mutationFn: () => recordExpense(gymId, {
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount),
      date: form.date || undefined,
      isRecurring: form.isRecurring,
      receiptUrl: form.receiptUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', gymId] });
      qc.invalidateQueries({ queryKey: ['expense-summary', gymId] });
      setForm(emptyForm);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', gymId] });
      qc.invalidateQueries({ queryKey: ['expense-summary', gymId] });
      setDeleteTarget(null);
    },
  });

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['Date', 'Category', 'Description', 'Amount', 'Recurring', 'Notes'],
      ...expenses.map((e) => [
        new Date(e.date).toLocaleDateString('en-IN'),
        categoryLabel(e.category),
        e.description,
        e.amount,
        e.isRecurring ? 'Yes' : 'No',
        e.notes || '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const topCategory = summary?.byCategory?.length
    ? [...summary.byCategory].sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-sunken rounded-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface rounded-card p-5 border border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> This Month
            </p>
            <p className="text-2xl font-extrabold tabular-nums text-danger-ink">
              ₹{(summary?.monthTotal ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-surface rounded-card p-5 border border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> All-Time Total
            </p>
            <p className="text-2xl font-extrabold tabular-nums text-ink">
              ₹{(summary?.allTimeTotal ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-surface rounded-card p-5 border border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Top Category (Month)
            </p>
            {topCategory ? (
              <>
                <p className="text-lg font-extrabold text-ink">{categoryLabel(topCategory.category)}</p>
                <p className="text-xs text-ink-muted mt-0.5 tabular-nums">₹{(topCategory._sum.amount ?? 0).toLocaleString('en-IN')}</p>
              </>
            ) : (
              <p className="text-lg font-extrabold text-ink-muted">-</p>
            )}
          </div>
          <div className="bg-surface rounded-card p-5 border border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Categories (Month)</p>
            <p className="text-2xl font-extrabold tabular-nums text-ink">{summary?.byCategory?.length ?? 0}</p>
            <p className="text-xs text-ink-muted mt-0.5">of {CATEGORIES.length} tracked</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Add expense form */}
        <div className="bg-surface rounded-card border border-line p-6">
          <h3 className="font-bold text-lg mb-4">Record an Expense</h3>
          <form
            className="grid sm:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.description.trim() && Number(form.amount) > 0) recordMut.mutate();
            }}
          >
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </select>
            <div>
              <label htmlFor="expensestab-f1" className="block text-sm font-semibold text-ink mb-1.5">Amount (₹)</label>
              <input id="expensestab-f1"
                className="input-field"
                type="number"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="expensestab-f2" className="block text-sm font-semibold text-ink mb-1.5">Description</label>
              <input id="expensestab-f2"
                className="input-field"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. August rent, gym floor"
                maxLength={500}
                required
              />
            </div>
            <div>
              <label htmlFor="expensestab-f3" className="block text-sm font-semibold text-ink mb-1.5">Date</label>
              <input id="expensestab-f3"
                className="input-field"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="flex items-end pb-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                  className="w-4 h-4 rounded border-line accent-accent"
                />
                Recurring expense
                <RotateCcw className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
              </label>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="expensestab-f4" className="block text-sm font-semibold text-ink mb-1.5">Receipt URL (optional)</label>
              <input id="expensestab-f4"
                className="input-field"
                value={form.receiptUrl}
                onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
                placeholder="https://…"
                maxLength={1000}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="expensestab-f5" className="block text-sm font-semibold text-ink mb-1.5">Notes</label>
              <input id="expensestab-f5"
                className="input-field"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
                maxLength={1000}
              />
            </div>
            {recordMut.isError && (
              <div className="sm:col-span-2 bg-danger-soft text-danger-ink p-3 rounded-control text-sm border border-danger">
                {(recordMut.error as any)?.response?.data?.error || 'Failed to record expense'}
              </div>
            )}
            <button type="submit" className="btn-primary justify-center sm:col-span-2" disabled={recordMut.isPending || !gymId}>
              <Plus className="w-4 h-4" /> {recordMut.isPending ? 'Saving…' : 'Record Expense'}
            </button>
          </form>
        </div>

        {/* Expenses table */}
        <div className="bg-surface rounded-card border border-line overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex flex-wrap justify-between items-center gap-3">
            <h2 className="font-bold text-lg">Expenses ({expenses.length})</h2>
            <button onClick={exportCsv} className="btn-outline text-sm px-3 py-1.5" disabled={expenses.length === 0}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>

          <div className="px-6 pt-4 flex flex-wrap gap-2">
            <div className="flex flex-wrap rounded-control border border-line overflow-hidden">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  categoryFilter === 'ALL'
                    ? 'bg-accent text-on-accent'
                    : 'text-ink-muted hover:bg-surface-sunken'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    categoryFilter === c
                      ? 'bg-accent text-on-accent'
                      : 'text-ink-muted hover:bg-surface-sunken'
                  }`}
                >
                  {categoryLabel(c)}
                </button>
              ))}
            </div>
          </div>

          {expensesLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-surface-sunken rounded-control animate-pulse" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-ink-muted">
              {categoryFilter === 'ALL' ? 'No expenses recorded yet.' : 'No expenses match this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken">
                  <tr>
                    {['Date', 'Category', 'Description', 'Amount', 'Recurring', 'Notes', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-surface-sunken">
                      <td className="px-6 py-4 text-ink-muted whitespace-nowrap">{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_STYLES[exp.category] || CATEGORY_STYLES.MISC}`}>
                          {categoryLabel(exp.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold max-w-[220px] truncate" title={exp.description}>{exp.description}</td>
                      <td className="px-6 py-4 font-semibold text-accent-ink tabular-nums whitespace-nowrap">₹{exp.amount.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        {exp.isRecurring ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-ink">
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Recurring
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-ink-muted max-w-[200px] truncate" title={exp.notes || ''}>{exp.notes || '-'}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setDeleteTarget(exp)}
                          aria-label={`Delete expense: ${exp.description}`}
                          className="inline-flex items-center gap-1 text-danger-ink hover:text-danger-ink font-semibold text-xs hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete expense"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.description}" (₹${deleteTarget.amount.toLocaleString('en-IN')})? This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
