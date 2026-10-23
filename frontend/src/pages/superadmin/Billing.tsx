import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Diamond, Plus } from 'lucide-react';
import api from '../../services/api';
import { Button, DataTable, EmptyState, Field, Input, PageHeader, Select, StatusBadge } from '../../components/ui';
import { dateIN, getAdminGyms, getAdminPlans, getAdminSubs, rupees, type AdminPlan, type AdminSub } from '../../api/superadmin.api';
import { Panel } from './Panel';

const SUB_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'EXPIRED', 'CANCELLED'];
const EMPTY_PLAN = { name: '', code: '', description: '', monthlyPrice: 0, maxGyms: 1, maxMembers: '', maxTrainers: '', maxStaff: '', features: '' };
const EMPTY_SUB = { gymId: '', planId: '', startDate: '' };

const limits = (p: AdminPlan) =>
  [
    `${p.maxGyms} gym${p.maxGyms > 1 ? 's' : ''}`,
    p.maxMembers && `${p.maxMembers} members`,
    p.maxTrainers && `${p.maxTrainers} trainers`,
    p.maxStaff && `${p.maxStaff} staff`,
    p.advancedReports && 'reports',
  ]
    .filter(Boolean)
    .join(', ');

export default function Billing() {
  const qc = useQueryClient();
  const { data: plans = [], isLoading: plansLoading } = useQuery({ queryKey: ['saas-plans'], queryFn: getAdminPlans, refetchInterval: 30000 });
  const { data: subs = [], isLoading: subsLoading } = useQuery({ queryKey: ['saas-subscriptions'], queryFn: getAdminSubs, refetchInterval: 30000 });
  const { data: gyms = [] } = useQuery({ queryKey: ['admin-gyms'], queryFn: getAdminGyms });
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [subForm, setSubForm] = useState(EMPTY_SUB);

  const refreshAudit = () => qc.invalidateQueries({ queryKey: ['admin-audit'] });
  const refreshSubs = () => {
    qc.invalidateQueries({ queryKey: ['saas-subscriptions'] });
    qc.invalidateQueries({ queryKey: ['analytics'] });
    refreshAudit();
  };

  const createPlan = useMutation({
    mutationFn: (data: typeof EMPTY_PLAN) =>
      api.post('/saas/plans', {
        ...data,
        description: data.description || null,
        monthlyPrice: Number(data.monthlyPrice) || 0,
        maxGyms: Number(data.maxGyms) || 1,
        maxMembers: data.maxMembers ? Number(data.maxMembers) : null,
        maxTrainers: data.maxTrainers ? Number(data.maxTrainers) : null,
        maxStaff: data.maxStaff ? Number(data.maxStaff) : null,
        features: data.features ? data.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saas-plans'] });
      refreshAudit();
      setPlanForm(EMPTY_PLAN);
    },
  });
  const togglePlan = useMutation({
    mutationFn: (plan: AdminPlan) => api.put(`/saas/plans/${plan.id}`, { isActive: !plan.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saas-plans'] });
      refreshAudit();
    },
  });
  const createSub = useMutation({
    mutationFn: (data: typeof EMPTY_SUB) => api.post('/saas/subscriptions', { ...data, startDate: data.startDate || undefined }),
    onSuccess: () => {
      refreshSubs();
      setSubForm(EMPTY_SUB);
    },
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/saas/subscriptions/${id}`, { status }),
    onSuccess: refreshSubs,
  });

  const text = (key: keyof typeof EMPTY_PLAN) => (e: React.ChangeEvent<HTMLInputElement>) => setPlanForm({ ...planForm, [key]: e.target.value });

  return (
    <div className="space-y-6">
      <PageHeader title="Plans and subscriptions" description="The plans gyms subscribe to, and which gym is on which plan." />

      <Panel title={`Plans (${plans.length})`}>
        <DataTable<AdminPlan>
          caption="Subscription plans"
          loading={plansLoading}
          rows={plans}
          rowKey={(p) => p.id}
          empty={<EmptyState title="No plans yet" description="Create one below." icon={Diamond} />}
          columns={[
            {
              key: 'plan',
              header: 'Plan',
              cell: (p) => (
                <span className="block text-left">
                  <span className="font-medium">{p.name}</span> <span className="font-mono text-xs text-ink-muted">({p.code})</span>
                  {p.description && <span className="block max-w-64 truncate text-ink-muted">{p.description}</span>}
                </span>
              ),
            },
            { key: 'price', header: 'Price', align: 'right', cell: (p) => `${rupees(p.monthlyPrice)}/mo` },
            { key: 'limits', header: 'Limits', cell: (p) => limits(p) },
            { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.isActive ? 'ACTIVE' : 'inactive'} /> },
            {
              key: 'action',
              header: 'Action',
              cell: (p) => (
                <Button size="sm" variant="ghost" onClick={() => togglePlan.mutate(p)} disabled={togglePlan.isPending}>
                  {p.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              ),
            },
          ]}
        />
      </Panel>

      <Panel title="Create plan">
        <form
          className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            createPlan.mutate(planForm);
          }}
        >
          <Field label="Plan name" required>
            <Input value={planForm.name} onChange={text('name')} />
          </Field>
          <Field label="Code" hint="For example GROW" required>
            <Input value={planForm.code} onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Price per month (₹)">
            <Input type="number" min={0} value={planForm.monthlyPrice} onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: Number(e.target.value) })} />
          </Field>
          <Field label="Max gyms">
            <Input type="number" min={1} value={planForm.maxGyms} onChange={(e) => setPlanForm({ ...planForm, maxGyms: Number(e.target.value) })} />
          </Field>
          <Field label="Max members" hint="Blank means unlimited">
            <Input value={planForm.maxMembers} onChange={text('maxMembers')} inputMode="numeric" />
          </Field>
          <Field label="Max trainers" hint="Blank means unlimited">
            <Input value={planForm.maxTrainers} onChange={text('maxTrainers')} inputMode="numeric" />
          </Field>
          <Field label="Max staff" hint="Blank means unlimited">
            <Input value={planForm.maxStaff} onChange={text('maxStaff')} inputMode="numeric" />
          </Field>
          <Field label="Features" hint="Comma separated">
            <Input value={planForm.features} onChange={text('features')} />
          </Field>
          <Field label="Description" className="sm:col-span-2 lg:col-span-4">
            <Input value={planForm.description} onChange={text('description')} />
          </Field>
          {createPlan.isError && (
            <p role="alert" className="text-sm font-medium text-danger-ink sm:col-span-2 lg:col-span-4">
              Could not create the plan. Check the fields and try again.
            </p>
          )}
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" icon={Plus} loading={createPlan.isPending} disabled={!planForm.name || !planForm.code}>
              Create plan
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title={`Gym subscriptions (${subs.length})`}>
        <DataTable<AdminSub>
          caption="Gym subscriptions"
          loading={subsLoading}
          rows={subs}
          rowKey={(s) => s.id}
          empty={<EmptyState title="No subscriptions yet" description="Assign a plan to a gym below." icon={Diamond} />}
          columns={[
            {
              key: 'gym',
              header: 'Gym',
              cell: (s) => (
                <span className="block text-left">
                  <span className="block font-medium">{s.gym.name}</span>
                  <span className="block text-ink-muted">{s.gym.city}</span>
                </span>
              ),
            },
            { key: 'plan', header: 'Plan', cell: (s) => `${s.plan.name} (${rupees(s.plan.monthlyPrice)}/mo)` },
            { key: 'amount', header: 'Amount', align: 'right', cell: (s) => rupees(s.amount) },
            { key: 'period', header: 'Period', cell: (s) => `${dateIN(s.startDate)} to ${dateIN(s.endDate)}` },
            { key: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
            {
              key: 'update',
              header: 'Update status',
              cell: (s) => (
                <Select
                  aria-label={`Update status for ${s.gym.name}`}
                  value={s.status}
                  onChange={(e) => updateStatus.mutate({ id: s.id, status: e.target.value })}
                  disabled={updateStatus.isPending}
                  className="min-w-36"
                >
                  {SUB_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st.charAt(0) + st.slice(1).toLowerCase()}
                    </option>
                  ))}
                </Select>
              ),
            },
          ]}
        />
      </Panel>

      <Panel title="Assign plan to gym">
          <form
            className="grid gap-4 p-4 sm:p-5 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              createSub.mutate(subForm);
            }}
          >
            <Field label="Gym">
              <Select value={subForm.gymId} onChange={(e) => setSubForm({ ...subForm, gymId: e.target.value })}>
                <option value="">Select gym</option>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.city})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Plan">
              <Select value={subForm.planId} onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}>
                <option value="">Select plan</option>
                {plans
                  .filter((p) => p.isActive)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}, {rupees(p.monthlyPrice)}/mo
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Start date">
              <Input type="date" value={subForm.startDate} onChange={(e) => setSubForm({ ...subForm, startDate: e.target.value })} />
            </Field>
            {createSub.isError && (
              <p role="alert" className="text-sm font-medium text-danger-ink md:col-span-3">
                Could not create the subscription. Select a gym and an active plan.
              </p>
            )}
            <div className="md:col-span-3">
              <Button type="submit" icon={Plus} loading={createSub.isPending} disabled={!subForm.gymId || !subForm.planId}>
                Start subscription
              </Button>
            </div>
          </form>
      </Panel>
    </div>
  );
}
