import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { decideRefund, type PayoutRow, type RefundRow } from '../../api/payment.api';
import DataTable, { type Column } from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import type { TableState } from '../../components/ui/useTableQuery';
import { useNotificationStore } from '../../store/useNotificationStore';
import { formatPrice } from '../../utils/format';

type OrderRow = {
  id: string;
  status: string;
  planSnapshot: { name: string };
  totalPaise: number;
  commissionPaise: number;
  gymNetPaise: number;
  paidAt: string | null;
  createdAt: string;
  gym: { id: string; name: string };
  memberUser: { username: string; email: string };
};

type Issue = { id: string; kind: string; ref: string; details: string | null; createdAt: string };

const rupees = (paise: number) => formatPrice(paise / 100);
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '-');

// Four tables on one page, so each keeps its paging in local state rather than the URL.
function useLocalTable() {
  const [state, setState] = useState<TableState>({ page: 1, pageSize: 20, sort: null, search: '', filters: {} });
  return { state, onChange: (patch: Partial<TableState>) => setState((s) => ({ ...s, ...patch, page: patch.page ?? 1 })) };
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-[var(--color-deepgray)] dark:text-white">{title}</h2>
    {children}
  </section>
);

const orderColumns: Column<OrderRow>[] = [
  { key: 'createdAt', header: 'Created', cell: (o) => date(o.createdAt), sortValue: (o) => o.createdAt },
  { key: 'gym', header: 'Gym', cell: (o) => o.gym.name, sortValue: (o) => o.gym.name },
  { key: 'member', header: 'Member', cell: (o) => o.memberUser.email },
  { key: 'plan', header: 'Plan', cell: (o) => o.planSnapshot.name },
  { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} />, sortValue: (o) => o.status },
  { key: 'totalPaise', header: 'Total', align: 'right', cell: (o) => rupees(o.totalPaise), sortValue: (o) => o.totalPaise },
  { key: 'commissionPaise', header: 'Commission', align: 'right', cell: (o) => rupees(o.commissionPaise), sortValue: (o) => o.commissionPaise },
];

const payoutColumns: Column<PayoutRow>[] = [
  { key: 'createdAt', header: 'Date', cell: (p) => date(p.createdAt), sortValue: (p) => p.createdAt },
  { key: 'gym', header: 'Gym', cell: (p) => p.gym.name, sortValue: (p) => p.gym.name },
  { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} />, sortValue: (p) => p.status },
  { key: 'transfer', header: 'Transfer', cell: (p) => p.razorpayTransferId ?? p.failureReason ?? '-' },
  { key: 'amountPaise', header: 'Amount', align: 'right', cell: (p) => rupees(p.amountPaise), sortValue: (p) => p.amountPaise },
];

const issueColumns: Column<Issue>[] = [
  { key: 'createdAt', header: 'Found', cell: (i) => date(i.createdAt), sortValue: (i) => i.createdAt },
  { key: 'kind', header: 'Problem', cell: (i) => i.kind.toLowerCase().replace(/_/g, ' '), sortValue: (i) => i.kind },
  { key: 'ref', header: 'Reference' },
  { key: 'details', header: 'Details', cell: (i) => i.details ?? '-' },
];

const ACCOUNT_ID = /^acc_[a-zA-Z0-9]{6,40}$/;

// The linked account is created and KYC'd at Razorpay; this only records its id.
function PayoutAccountForm() {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const { data: gyms = [] } = useQuery<{ id: string; name: string; city: string }[]>({
    queryKey: ['admin-gyms'],
    queryFn: () => api.get('/admin/gyms').then((r) => r.data),
  });
  const [form, setForm] = useState({ gymId: '', razorpayAccountId: '', status: 'ACTIVE' });
  const accountValid = ACCOUNT_ID.test(form.razorpayAccountId.trim());

  // Errors are surfaced by the global API interceptor.
  const save = useMutation({
    mutationFn: () => api.put(`/admin/gyms/${form.gymId}/payout-account`, { razorpayAccountId: form.razorpayAccountId.trim(), status: form.status }),
    onSuccess: () => {
      addNotification('success', 'Payout account saved.');
      setForm({ gymId: '', razorpayAccountId: '', status: 'ACTIVE' });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.gymId && accountValid) save.mutate();
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-[1.2fr_1fr_0.8fr_auto] md:items-start">
      <select className="input-field min-h-11" aria-label="Gym" value={form.gymId} onChange={(e) => setForm({ ...form, gymId: e.target.value })} required>
        <option value="">Choose a gym</option>
        {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}, {g.city}</option>)}
      </select>
      <div>
        <input
          className="input-field min-h-11 w-full"
          aria-label="Razorpay account id"
          aria-invalid={form.razorpayAccountId !== '' && !accountValid}
          aria-describedby="account-id-hint"
          placeholder="acc_..."
          value={form.razorpayAccountId}
          onChange={(e) => setForm({ ...form, razorpayAccountId: e.target.value })}
          required
        />
        <p id="account-id-hint" className={`mt-1 text-xs ${form.razorpayAccountId !== '' && !accountValid ? 'text-red-600' : 'text-gray-500'}`}>
          The linked account id from the Razorpay Route dashboard, e.g. acc_KZ1a2b3c4d.
        </p>
      </div>
      <select className="input-field min-h-11" aria-label="Payout account status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
        <option value="ACTIVE">Active</option>
        <option value="PENDING_KYC">KYC pending</option>
        <option value="SUSPENDED">Suspended</option>
      </select>
      <button type="submit" className="btn-primary min-h-11 justify-center" disabled={!form.gymId || !accountValid || save.isPending}>Save</button>
    </form>
  );
}

export default function FinancePanel() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const orders = useQuery<OrderRow[]>({ queryKey: ['admin-orders'], queryFn: () => api.get('/admin/orders').then((r) => r.data) });
  const refunds = useQuery<RefundRow[]>({ queryKey: ['admin-refunds'], queryFn: () => api.get('/admin/refunds').then((r) => r.data) });
  const payouts = useQuery<PayoutRow[]>({ queryKey: ['admin-payouts'], queryFn: () => api.get('/admin/payouts').then((r) => r.data) });
  const issues = useQuery<Issue[]>({ queryKey: ['admin-reconciliation'], queryFn: () => api.get('/admin/reconciliation').then((r) => r.data) });
  const tables = { orders: useLocalTable(), refunds: useLocalTable(), payouts: useLocalTable(), issues: useLocalTable() };

  // Errors are surfaced by the global API interceptor.
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) => decideRefund(id, decision),
    onSuccess: (refund) => {
      addNotification('success', refund.status === 'REJECTED' ? 'Refund declined.' : 'Refund sent.');
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reconciliation'] });
    },
  });

  const refundColumns: Column<RefundRow>[] = [
    { key: 'createdAt', header: 'Asked on', cell: (r) => date(r.createdAt), sortValue: (r) => r.createdAt },
    { key: 'gym', header: 'Gym', cell: (r) => r.order.gym.name, sortValue: (r) => r.order.gym.name },
    { key: 'member', header: 'Member', cell: (r) => r.order.memberUser.email },
    { key: 'reason', header: 'Reason', cell: (r) => r.reason ?? '-' },
    { key: 'amountPaise', header: 'Amount', align: 'right', cell: (r) => `${rupees(r.amountPaise)} of ${rupees(r.order.totalPaise)}`, sortValue: (r) => r.amountPaise },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      cell: (r) =>
        r.status === 'REQUESTED' ? (
          <span className="flex gap-2">
            <button type="button" className="btn-primary min-h-11" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, decision: 'APPROVED' })}>Refund</button>
            <button type="button" className="btn-outline min-h-11" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, decision: 'REJECTED' })}>Decline</button>
          </span>
        ) : (
          <StatusBadge status={r.status} tone={r.status === 'PROCESSED' ? 'success' : undefined} />
        ),
    },
  ];

  return (
    <div className="space-y-10">
      <Section title="Refunds">
        <DataTable label="Refunds" columns={refundColumns} rows={refunds.data} rowKey={(r) => r.id} {...tables.refunds} loading={refunds.isLoading} error={refunds.error} onRetry={() => refunds.refetch()} emptyTitle="No refund requests." />
      </Section>
      <Section title="Mismatches with Razorpay">
        <DataTable label="Reconciliation mismatches" columns={issueColumns} rows={issues.data} rowKey={(i) => i.id} {...tables.issues} loading={issues.isLoading} error={issues.error} onRetry={() => issues.refetch()} emptyTitle="Nothing to check." emptyHint="The daily reconciliation lists payments, refunds and transfers that don't match Razorpay." />
      </Section>
      <Section title="Payout accounts">
        <PayoutAccountForm />
      </Section>
      <Section title="Payouts">
        <DataTable label="Payouts" columns={payoutColumns} rows={payouts.data} rowKey={(p) => p.id} {...tables.payouts} loading={payouts.isLoading} error={payouts.error} onRetry={() => payouts.refetch()} emptyTitle="No payouts yet." />
      </Section>
      <Section title="Orders">
        <DataTable
          label="Marketplace orders"
          columns={orderColumns}
          rows={orders.data}
          rowKey={(o) => o.id}
          {...tables.orders}
          loading={orders.isLoading}
          error={orders.error}
          onRetry={() => orders.refetch()}
          searchPlaceholder="Search gym or member…"
          searchText={(o) => `${o.gym.name} ${o.memberUser.email} ${o.memberUser.username}`}
          emptyTitle="No orders yet."
        />
      </Section>
    </div>
  );
}
