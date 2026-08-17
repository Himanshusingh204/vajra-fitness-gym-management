import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Receipt, TrendingDown, Plus, Trash2, Download, RotateCcw } from 'lucide-react';
import { getExpenses, recordExpense, deleteExpense, getExpenseSummary, type Expense } from '../../api/expense.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

const CATEGORIES = [
  'RENT', 'ELECTRICITY', 'INTERNET', 'SALARIES', 'MAINTENANCE',
  'EQUIPMENT', 'MARKETING', 'CLEANING', 'SOFTWARE', 'MISC',
] as const;

const CATEGORY_STYLES: Record<string, string> = {
  RENT: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  ELECTRICITY: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  INTERNET: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  SALARIES: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  MAINTENANCE: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  EQUIPMENT: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  MARKETING: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  CLEANING: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  SOFTWARE: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  MISC: 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400',
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

const todayStr = () => new Date().toISOString().slice(0, 10);

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
            <div key={i} className="h-24 bg-[var(--color-border)]/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> This Month
            </p>
            <p className="text-2xl font-extrabold tabular-nums text-red-500">
              ₹{(summary?.monthTotal ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> All-Time Total
            </p>
            <p className="text-2xl font-extrabold tabular-nums text-[var(--color-deepgray)] dark:text-white">
              ₹{(summary?.allTimeTotal ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Top Category (Month)
            </p>
            {topCategory ? (
              <>
                <p className="text-lg font-extrabold text-[var(--color-deepgray)] dark:text-white">{categoryLabel(topCategory.category)}</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5 tabular-nums">₹{(topCategory._sum.amount ?? 0).toLocaleString('en-IN')}</p>
              </>
            ) : (
              <p className="text-lg font-extrabold text-[var(--color-muted)]">—</p>
            )}
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Categories (Month)</p>
            <p className="text-2xl font-extrabold tabular-nums text-[var(--color-deepgray)] dark:text-white">{summary?.byCategory?.length ?? 0}</p>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">of {CATEGORIES.length} tracked</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Add expense form */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
          <h3 className="font-bold text-lg dark:text-white mb-4">Record an Expense</h3>
          <form
            className="grid sm:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.description.trim() && Number(form.amount) > 0) recordMut.mutate();
            }}
          >
            <select
              className="input-field bg-white! dark:bg-[#1a1a1a]!"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </select>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Amount (₹)</label>
              <input
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
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <input
                className="input-field"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. August rent, gym floor"
                maxLength={500}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
              <input
                className="input-field"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="flex items-end pb-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                />
                Recurring expense
                <RotateCcw className="w-3.5 h-3.5 text-[var(--color-muted)]" aria-hidden="true" />
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Receipt URL (optional)</label>
              <input
                className="input-field"
                value={form.receiptUrl}
                onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
                placeholder="https://…"
                maxLength={1000}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <input
                className="input-field"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
                maxLength={1000}
              />
            </div>
            {recordMut.isError && (
              <div className="sm:col-span-2 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm border border-red-200 dark:border-red-500/20">
                {(recordMut.error as any)?.response?.data?.error || 'Failed to record expense'}
              </div>
            )}
            <button type="submit" className="btn-primary justify-center sm:col-span-2" disabled={recordMut.isPending || !gymId}>
              <Plus className="w-4 h-4" /> {recordMut.isPending ? 'Saving…' : 'Record Expense'}
            </button>
          </form>
        </div>

        {/* Expenses table */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] flex flex-wrap justify-between items-center gap-3">
            <h2 className="font-bold text-lg dark:text-white">Expenses ({expenses.length})</h2>
            <button onClick={exportCsv} className="btn-outline text-sm px-3 py-1.5" disabled={expenses.length === 0}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>

          <div className="px-6 pt-4 flex flex-wrap gap-2">
            <div className="flex flex-wrap rounded-lg border border-[var(--color-border)] overflow-hidden">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  categoryFilter === 'ALL'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-muted)] hover:bg-gray-50 dark:hover:bg-white/5'
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
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-muted)] hover:bg-gray-50 dark:hover:bg-white/5'
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
                <div key={i} className="h-10 bg-[var(--color-border)]/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-muted)]">
              {categoryFilter === 'ALL' ? 'No expenses recorded yet.' : 'No expenses match this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    {['Date', 'Category', 'Description', 'Amount', 'Recurring', 'Notes', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-6 py-4 text-[var(--color-muted)] whitespace-nowrap">{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_STYLES[exp.category] || CATEGORY_STYLES.MISC}`}>
                          {categoryLabel(exp.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold dark:text-white max-w-[220px] truncate" title={exp.description}>{exp.description}</td>
                      <td className="px-6 py-4 font-semibold text-[var(--color-primary)] tabular-nums whitespace-nowrap">₹{exp.amount.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        {exp.isRecurring ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Recurring
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--color-muted)] max-w-[200px] truncate" title={exp.notes || ''}>{exp.notes || '—'}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setDeleteTarget(exp)}
                          aria-label={`Delete expense: ${exp.description}`}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-xs hover:underline"
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
