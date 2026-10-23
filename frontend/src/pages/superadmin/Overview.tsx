import { useQuery } from '@tanstack/react-query';
import { Building2, DollarSign } from 'lucide-react';
import { LineChart } from '../../components/charts';
import { DataTable, EmptyState, PageHeader, Skeleton, StatTile, StatusBadge } from '../../components/ui';
import { dateIN, getAdminGyms, getAnalytics, rupees, type AdminGym, type Analytics } from '../../api/superadmin.api';
import { Panel } from './Panel';

const GYM_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending: 'Pending approval',
  trial: 'On trial',
  past_due: 'Past due',
  expired: 'Expired or cancelled',
};

type TopGym = Analytics['topGyms'][number];

export default function Overview() {
  const { data: analytics, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: getAnalytics, refetchInterval: 30000 });
  const { data: gyms = [], isLoading: gymsLoading } = useQuery({ queryKey: ['admin-gyms'], queryFn: getAdminGyms, refetchInterval: 30000 });

  const plans = Object.entries(analytics?.revenueByPlan ?? {});
  const statuses = Object.entries(analytics?.gymsByStatus ?? {});

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Subscription revenue, gym growth and the state of the platform." />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Monthly recurring revenue" value={rupees(analytics?.mrr ?? 0)} hint="MRR" />
            <StatTile label="Annual recurring revenue" value={rupees(analytics?.arr ?? 0)} hint="ARR" />
            <StatTile label="Churn rate" value={`${analytics?.churnRate ?? 0}%`} hint={`${analytics?.churnedCount ?? 0} churned this month`} />
            <StatTile
              label="Customer lifetime value"
              value={analytics?.cltv == null ? 'No churn yet' : rupees(analytics.cltv)}
              hint="CLTV"
            />
            <StatTile label="ARPU" value={rupees(analytics?.arpu ?? 0)} hint="Average revenue per gym" />
            <StatTile label="New subscriptions" value={analytics?.newSubscriptionsThisMonth ?? 0} hint="This month" />
            <StatTile label="Trial conversion" value={`${analytics?.trialConversionRate ?? 0}%`} hint="Trial to paid" />
            <StatTile label="Failed payments" value={analytics?.failedPayments ?? 0} hint="This month" />
            <StatTile label="Total gyms" value={analytics?.totalGyms ?? 0} hint={`${analytics?.activeGyms ?? 0} active`} />
            <StatTile label="Total members" value={analytics?.totalMembers ?? 0} hint={`${analytics?.activeMembers ?? 0} active`} />
            <StatTile label="Platform revenue" value={rupees(analytics?.platformRevenue ?? 0)} hint="All-time fees" />
            <StatTile
              label="Staff and trainers"
              value={(analytics?.totalStaff ?? 0) + (analytics?.totalTrainers ?? 0)}
              hint={`${analytics?.totalTrainers ?? 0} trainers`}
            />
          </div>

          <Panel title="Subscription revenue, last 6 months">
            <div className="p-4">
              <LineChart
                series={[{ name: 'Subscription revenue', data: (analytics?.monthlyRevenueTrend ?? []).map((d) => ({ label: d.month, value: d.total })) }]}
                config={{ height: 320, showArea: true, colors: ['var(--color-accent)'] }}
              />
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Revenue by plan (MRR)">
              {plans.length === 0 ? (
                <EmptyState title="No active subscriptions yet" icon={DollarSign} />
              ) : (
                <ul className="divide-y divide-line">
                  {plans.map(([plan, revenue]) => (
                    <li key={plan} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                      <span className="font-medium text-ink">{plan}</span>
                      <span className="font-semibold tabular-nums text-ink">{rupees(revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Gym status">
              {statuses.length === 0 ? (
                <EmptyState title="No gyms yet" icon={Building2} />
              ) : (
                <ul className="divide-y divide-line">
                  {statuses.map(([status, count]) => (
                    <li key={status} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                      <span className="font-medium text-ink">{GYM_STATUS_LABELS[status] ?? status}</span>
                      <span className="font-semibold tabular-nums text-ink">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Top gyms by members">
            <DataTable<TopGym>
              caption="Top gyms by member count"
              rows={analytics?.topGyms ?? []}
              rowKey={(g) => g.id}
              empty={<EmptyState title="No gyms with members yet" icon={Building2} />}
              columns={[
                { key: 'name', header: 'Gym', cell: (g) => <span className="font-medium">{g.name}</span> },
                { key: 'city', header: 'City', cell: (g) => g.city },
                { key: 'members', header: 'Members', align: 'right', cell: (g) => g.memberCount },
                { key: 'plan', header: 'Plan', cell: (g) => g.plan },
                { key: 'status', header: 'Subscription', cell: (g) => <StatusBadge status={g.subscriptionStatus} /> },
              ]}
            />
          </Panel>
        </>
      )}

      <Panel title="Recently registered gyms">
        <DataTable<AdminGym>
          caption="Recently registered gyms"
          loading={gymsLoading}
          rows={gyms.slice(0, 5)}
          rowKey={(g) => g.id}
          empty={<EmptyState title="No gyms registered yet" icon={Building2} />}
          columns={[
            { key: 'name', header: 'Gym', cell: (g) => <span className="font-medium">{g.name}</span> },
            { key: 'loc', header: 'Location', cell: (g) => `${g.city}, ${g.state}` },
            { key: 'owner', header: 'Owner', cell: (g) => g.owner?.email ?? '-' },
            { key: 'date', header: 'Registered', cell: (g) => dateIN(g.createdAt) },
            { key: 'status', header: 'Status', cell: (g) => <StatusBadge status={g.isApproved ? 'ACTIVE' : 'PENDING'} /> },
          ]}
        />
      </Panel>
    </div>
  );
}
