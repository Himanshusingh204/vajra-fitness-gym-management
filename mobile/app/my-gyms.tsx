import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Card, StatusPill } from '@/components/Card';
import { QueryList } from '@/components/QueryList';
import { Text } from '@/components/Text';
import { useMyGyms, useSwitchGym } from '@/hooks/useMemberData';
import { daysLeftLabel, daysUntil, formatDate } from '@/lib/format';
import { space } from '@/theme';

export default function MyGyms() {
  const router = useRouter();
  const gyms = useMyGyms();
  const switchGym = useSwitchGym();

  const open = (gymId: string, path: '/member' | '/member/payments') => {
    switchGym(gymId);
    router.replace(path);
  };

  return (
    <QueryList
      edges={['bottom']}
      query={gyms}
      items={gyms.data}
      keyExtractor={(g) => g.memberId}
      renderItem={(g) => {
        const active = g.activeMembership;
        return (
          <Card>
            <View style={styles.between}>
              <Text variant="heading" style={styles.name}>
                {g.gym.name}
              </Text>
              <StatusPill status={g.status} />
            </View>
            <Text muted>{g.gym.city}</Text>
            {active ? (
              <Text>
                {daysLeftLabel(daysUntil(active.endDate))}, until {formatDate(active.endDate)}
              </Text>
            ) : (
              <Text muted>No active membership.</Text>
            )}
            <Button label="Open this gym" variant="secondary" onPress={() => open(g.gymId, '/member')} />
            <Button label="Payments and receipts" variant="ghost" onPress={() => open(g.gymId, '/member/payments')} />
          </Card>
        );
      }}
      empty={{ title: 'No gyms yet', body: 'Find a gym and send a membership request.' }}
      header={<Button label="Join another gym" icon="add" onPress={() => router.push('/member/gyms')} />}
    />
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  name: { flex: 1 },
});
