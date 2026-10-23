import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getEnquiries, getGymAttendance, getGymFees, getGymStats } from '@/api/gym';
import { Card, ListRow, Stat, StatusPill } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { Text } from '@/components/Text';
import { useWorkGym } from '@/hooks/useWorkGym';
import { formatDate, formatMoney, formatTime, isOverdue, localDateKey } from '@/lib/format';
import { useUser } from '@/providers/AuthProvider';
import { space } from '@/theme';

export default function PartnerToday() {
  const gymId = useWorkGym();
  const user = useUser();
  const today = localDateKey();
  const on = !!gymId;
  const stats = useQuery({ queryKey: ['gym', gymId, 'stats'], queryFn: () => getGymStats(gymId!), enabled: on });
  const attendance = useQuery({ queryKey: ['gym', gymId, 'attendance', today], queryFn: () => getGymAttendance(gymId!, today), enabled: on });
  const enquiries = useQuery({ queryKey: ['gym', gymId, 'enquiries'], queryFn: () => getEnquiries(gymId!), enabled: on });
  const fees = useQuery({ queryKey: ['gym', gymId, 'fees'], queryFn: () => getGymFees(gymId!), enabled: on });

  const all = [stats, attendance, enquiries, fees];
  const refresh = () => all.forEach((q) => q.refetch());
  const gymName = user.ownedGyms[0]?.name;

  if (!gymId) {
    return (
      <Screen title="Today">
        <EmptyState title="No gym yet" body="Finish setting up your gym on the website." />
      </Screen>
    );
  }

  const newEnquiries = (enquiries.data ?? []).filter((e) => e.status === 'NEW').slice(0, 5);
  const overdue = (fees.data ?? []).filter((f) => isOverdue(f)).slice(0, 5);
  const checkIns = (attendance.data?.records ?? []).slice(0, 8);

  return (
    <Screen title="Today" subtitle={gymName} refreshing={all.some((q) => q.isRefetching)} onRefresh={refresh}>
      {stats.isPending ? (
        <Loading />
      ) : stats.isError ? (
        <ErrorState error={stats.error} onRetry={refresh} />
      ) : (
        <View style={styles.stats}>
          <Stat label="Check-ins today" value={stats.data.attendanceToday} tone="accent" />
          <Stat label="Active members" value={stats.data.activeMembers} />
          <Stat label="Pending approvals" value={stats.data.pendingMembers} tone={stats.data.pendingMembers ? 'warning' : undefined} />
          <Stat label="Unpaid fees" value={stats.data.pendingFees} tone={stats.data.pendingFees ? 'danger' : undefined} />
          <Stat label="Collected this month" value={formatMoney(stats.data.revenueThisMonth)} />
        </View>
      )}

      <Section title="Recent check-ins" query={attendance} empty="No one has checked in yet today.">
        {checkIns.map((r) => (
          <ListRow key={r.id} title={r.member?.user.username ?? r.staff?.user.username ?? 'Member'} subtitle={formatTime(r.checkIn)} />
        ))}
      </Section>

      <Section title="New enquiries" query={enquiries} empty="No new enquiries.">
        {newEnquiries.map((e) => (
          <ListRow key={e.id} title={e.name} subtitle={`${e.phone}, ${formatDate(e.date)}`} />
        ))}
      </Section>

      <Section title="Overdue fees" query={fees} empty="Nothing overdue.">
        {overdue.map((f) => (
          <ListRow
            key={f.id}
            title={f.member?.user.username ?? 'Member'}
            subtitle={`${formatMoney(f.amount)}, due ${formatDate(f.dueDate)}`}
            right={<StatusPill status="OVERDUE" />}
          />
        ))}
      </Section>
    </Screen>
  );
}

type SectionProps = {
  title: string;
  empty: string;
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  children: React.ReactNode[];
};

function Section({ title, empty, query, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : children.length ? (
        children
      ) : (
        <Card>
          <Text muted>{empty}</Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  section: { gap: space.sm },
});
