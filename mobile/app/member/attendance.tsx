import { StyleSheet, View } from 'react-native';
import { ListRow, Stat } from '@/components/Card';
import { QueryList } from '@/components/QueryList';
import { useMemberProfile, useMyAttendance } from '@/hooks/useMemberData';
import { formatDate, formatTime } from '@/lib/format';
import { space } from '@/theme';

export default function MemberAttendance() {
  const profile = useMemberProfile();
  const attendance = useMyAttendance(!!profile.data);
  const records = attendance.data?.records;

  const now = new Date();
  const thisMonth = (records ?? []).filter((r) => {
    const d = new Date(r.checkIn);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <QueryList
      title="Attendance"
      query={profile.data ? attendance : profile}
      items={records}
      keyExtractor={(r) => r.id}
      header={
        records?.length ? (
          <View style={styles.stats}>
            <Stat label="This month" value={thisMonth} tone="accent" />
            <Stat label="All visits" value={attendance.data?.total ?? 0} />
          </View>
        ) : null
      }
      renderItem={(r) => (
        <ListRow
          title={formatDate(r.checkIn)}
          subtitle={[`In at ${formatTime(r.checkIn)}`, r.checkOut ? `out at ${formatTime(r.checkOut)}` : null, r.gym?.name]
            .filter(Boolean)
            .join(', ')}
        />
      )}
      empty={{ title: 'No visits yet', body: 'Check-ins at the front desk appear here.' }}
    />
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space.md, flexWrap: 'wrap' },
});
