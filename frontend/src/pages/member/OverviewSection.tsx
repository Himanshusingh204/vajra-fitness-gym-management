import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarDays, CreditCard, MapPin } from 'lucide-react';
import { getMyFees } from '../../api/member.api';
import { getMyMemberships, getMyAttendance } from '../../api/membership.api';
import { getMyGymNotices } from '../../api/notice.api';
import { Button, Card, PageHeader, Skeleton, StatTile, StatusBadge } from '../../components/ui';
import { formatPrice } from '../../utils/format';
import { ActivityChart } from './ActivityChart';
import { useMemberProfile } from './useMemberProfile';

const localKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Check-ins per day for the last `days` days, bucketed in the viewer's timezone.
const dailyAttendance = (records: { checkIn: string }[], days: number) => {
  const now = new Date();
  const counts = new Map<string, number>();
  for (const r of records) {
    const key = localKey(new Date(r.checkIn));
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: counts.get(localKey(d)) || 0 };
  });
};

export default function OverviewSection() {
  const { data: profile } = useMemberProfile();

  const { data: memberships } = useQuery({ queryKey: ['myMemberships'], queryFn: getMyMemberships, refetchInterval: 30000 });
  const { data: attendance, isLoading: attendanceLoading } = useQuery({ queryKey: ['myAttendance'], queryFn: getMyAttendance, refetchInterval: 30000 });
  const { data: fees } = useQuery({
    queryKey: ['myFees', profile?.id],
    queryFn: () => getMyFees(profile?.id),
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });
  const { data: notices } = useQuery({ queryKey: ['myGymNotices'], queryFn: getMyGymNotices, refetchInterval: 60000 });

  const current = memberships?.[0];
  const now = new Date();
  const thisMonth = attendance?.records?.filter((r: any) => {
    const d = new Date(r.checkIn);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length ?? 0;
  const nextFee = fees
    ?.filter((f: any) => f.status !== 'PAID' && new Date(f.dueDate) >= now)
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const hasCheckIns = (attendance?.records?.length ?? 0) > 0;

  return (
    <>
      <PageHeader title="Overview" description={profile?.gym?.name ? `Home gym: ${profile.gym.name}` : undefined} />

      <Card>
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-card bg-accent-soft text-accent-ink">
            <Building2 className="size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-ink">{profile?.gym?.name}</h2>
              {current && <StatusBadge status={current.lifecycleStatus} />}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" aria-hidden="true" />
                {profile?.gym?.location || [profile?.gym?.city, profile?.gym?.state].filter(Boolean).join(', ')}
              </span>
              <span>{current?.plan?.name || profile?.membershipPlan?.name || 'No plan selected'}</span>
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 text-sm md:text-right">
            <div>
              <dt className="text-ink-muted">Plan fee</dt>
              <dd className="font-semibold text-ink">{current ? formatPrice(current.finalAmount) : '-'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Valid till</dt>
              <dd className="font-semibold text-ink">{current ? new Date(current.endDate).toLocaleDateString('en-IN') : '-'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Joined</dt>
              <dd className="font-semibold text-ink">{profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString('en-IN') : '-'}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button to="/dashboard/membership" variant="secondary" size="sm">Membership details</Button>
          <Button to="/membership" variant="ghost" size="sm">Browse other gyms</Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Current plan" value={current?.plan?.name || 'No active plan'} />
        <StatTile label="Next payment" icon={CreditCard} value={nextFee ? new Date(nextFee.dueDate).toLocaleDateString('en-IN') : 'None due'} />
        <StatTile label="This month" icon={CalendarDays} value={attendance ? `${thisMonth} visits` : '-'} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-ink">Gym visits, last 14 days</h2>
            <p className="text-sm text-ink-muted">Check-ins per day</p>
          </div>
          <Link to="/dashboard/attendance" className="text-sm font-semibold text-accent-ink hover:underline">View full history</Link>
        </div>
        {attendanceLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : hasCheckIns ? (
          <ActivityChart data={dailyAttendance(attendance.records, 14)} label="Check-ins per day over the last 14 days" />
        ) : (
          <p className="flex h-40 items-center justify-center text-center text-ink-muted">No check-ins yet. Visit your gym and check in at the front desk.</p>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Latest notices</h2>
          <Link to="/dashboard/notices" className="text-sm font-semibold text-accent-ink hover:underline">All notices</Link>
        </div>
        {notices && notices.length > 0 ? (
          <ul className="divide-y divide-line">
            {notices.slice(0, 3).map((n: any) => (
              <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                <p className="font-medium text-ink">{n.title}</p>
                <p className="line-clamp-2 text-sm text-ink-muted">{n.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No notices from your gym right now.</p>
        )}
      </Card>
    </>
  );
}
