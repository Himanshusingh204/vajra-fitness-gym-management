import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { getGymMemberships } from '../../api/booking.api';
import { getTrainerApplications } from '../../api/gymAdmin.api';
import { Card, EmptyState, Skeleton, StatTile } from '../../components/ui';
import { useGym } from './GymContext';
import type { GymStats } from './types';

type Enquiry = { id: string; status: string };
type Fee = { id: string; amount: number; status: string };
type MembershipRow = { id: string; lifecycleStatus: string; member?: { user?: { username?: string } } };

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function OverviewPage() {
  const { gym } = useGym();
  const gymId = gym?.id ?? '';

  const { data: stats, isLoading: statsLoading } = useQuery<GymStats>({
    queryKey: ['gym-stats', gymId],
    queryFn: () => api.get(`/gym/${gymId}/stats`).then((r) => r.data),
    enabled: !!gymId,
    refetchInterval: 30000,
  });
  const { data: enquiries = [] } = useQuery<Enquiry[]>({
    queryKey: ['enquiries', gymId],
    queryFn: () => api.get(`/enquiries/gym/${gymId}`).then((r) => r.data),
    enabled: !!gymId,
    refetchInterval: 30000,
  });
  const { data: memberships = [] } = useQuery<MembershipRow[]>({
    queryKey: ['gymMemberships', gymId],
    queryFn: () => getGymMemberships(gymId),
    enabled: !!gymId,
    refetchInterval: 30000,
  });
  const { data: fees = [] } = useQuery<Fee[]>({
    queryKey: ['fees', gymId],
    queryFn: () => api.get(`/fees/gym/${gymId}`).then((r) => r.data),
    enabled: !!gymId,
    refetchInterval: 30000,
  });
  const { data: applications = [] } = useQuery({
    queryKey: ['trainer-applications', gymId, 'PENDING'],
    queryFn: () => getTrainerApplications(gymId, 'PENDING'),
    enabled: !!gymId,
    refetchInterval: 30000,
  });

  const openEnquiries = enquiries.filter((e) => e.status === 'PENDING').length;
  const expiring = memberships.filter((m) => m.lifecycleStatus === 'EXPIRING_SOON');
  const unpaid = fees.filter((f) => f.status !== 'PAID');
  const unpaidTotal = unpaid.reduce((sum, f) => sum + f.amount, 0);
  const overdueCount = fees.filter((f) => f.status === 'OVERDUE').length;
  const expiringNames = expiring.slice(0, 3).map((m) => m.member?.user?.username).filter(Boolean).join(', ');

  const attention = [
    { key: 'members', count: stats?.pendingMembers ?? 0, title: 'Members waiting for approval', detail: 'Approve or reject new join requests.', to: '/admin/gym/members' },
    { key: 'trainers', count: applications.length, title: 'Trainer applications', detail: 'Review trainers who applied to your gym.', to: '/admin/gym/trainers?tab=applications' },
    {
      key: 'expiring',
      count: expiring.length,
      title: 'Memberships expiring soon',
      detail: expiringNames ? `${expiringNames}${expiring.length > 3 ? ' and others' : ''}` : 'Renew before they lapse.',
      to: '/admin/gym/members?tab=memberships',
    },
    {
      key: 'fees',
      count: unpaid.length,
      title: 'Unpaid fees',
      detail: `${rupees(unpaidTotal)} outstanding${overdueCount ? `, ${overdueCount} overdue` : ''}.`,
      to: '/admin/gym/fees',
    },
    { key: 'enquiries', count: openEnquiries, title: 'Open enquiries', detail: 'Follow up with people who asked about joining.', to: '/admin/gym/enquiries' },
  ].filter((item) => item.count > 0);

  const tiles = [
    { label: 'Total members', value: stats?.totalMembers ?? 0 },
    { label: 'Active members', value: stats?.activeMembers ?? 0 },
    { label: 'Pending requests', value: stats?.pendingMembers ?? 0 },
    { label: 'Check-ins today', value: stats?.attendanceToday ?? 0 },
    { label: 'Revenue this month', value: rupees(stats?.revenueThisMonth ?? 0) },
    { label: 'Total revenue', value: rupees(stats?.totalRevenue ?? 0) },
    { label: 'Pending fees', value: stats?.pendingFees ?? 0 },
    { label: 'Open enquiries', value: openEnquiries },
  ];

  return (
    <div className="space-y-6">
      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="mb-3 text-lg font-semibold text-ink">
          Needs attention
        </h2>
        <Card flush>
          {attention.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing needs attention" description="No pending approvals, expiring memberships, unpaid fees or open enquiries." />
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((item) => (
                <li key={item.key}>
                  <Link to={item.to} className="flex min-h-14 items-center gap-4 px-5 py-3 hover:bg-surface-sunken">
                    <span className="inline-flex min-w-9 justify-center rounded-full bg-warning-soft px-2.5 py-1 text-sm font-semibold text-warning-ink tabular-nums">{item.count}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{item.title}</span>
                      <span className="block truncate text-sm text-ink-muted">{item.detail}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="mb-3 text-lg font-semibold text-ink">
          This gym at a glance
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statsLoading
            ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)
            : tiles.map((t) => <StatTile key={t.label} label={t.label} value={t.value} />)}
        </div>
        <Card className="mt-4">
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            {[
              ['Trainers', stats?.trainers ?? 0],
              ['Staff', stats?.staff ?? 0],
              ['Membership plans', stats?.plans ?? 0],
              ['Notices', stats?.notices ?? 0],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-ink-muted">{label}</dt>
                <dd className="font-semibold text-ink tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>
    </div>
  );
}
