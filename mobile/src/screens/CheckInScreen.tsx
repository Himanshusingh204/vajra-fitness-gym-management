import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { getGymAttendance, getGymMembers, markAttendance } from '../api/gym';
import { Button } from '../components/Button';
import { ListRow, StatusPill } from '../components/Card';
import { Field } from '../components/Field';
import { QueryList } from '../components/QueryList';
import { FormError } from '../components/States';
import { Text } from '../components/Text';
import { useWorkGym } from '../hooks/useWorkGym';
import { localDateKey } from '../lib/format';
import { useTheme } from '../providers/ThemeProvider';

export default function CheckInScreen() {
  const gymId = useWorkGym();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const today = localDateKey();

  const members = useQuery({ queryKey: ['gym', gymId, 'members'], queryFn: () => getGymMembers(gymId!), enabled: !!gymId });
  const attendance = useQuery({
    queryKey: ['gym', gymId, 'attendance', today],
    queryFn: () => getGymAttendance(gymId!, today),
    enabled: !!gymId,
  });
  const checkIn = useMutation({
    mutationFn: (memberId: string) => markAttendance(gymId!, memberId),
    onSuccess: (_d, memberId) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const who = members.data?.find((m) => m.id === memberId)?.user.username ?? 'Member';
      setNotice(`${who} checked in.`);
      queryClient.invalidateQueries({ queryKey: ['gym', gymId, 'attendance'] });
    },
  });

  const inToday = new Set((attendance.data?.records ?? []).map((r) => r.memberId));
  const q = search.trim().toLowerCase();
  const items = members.data?.filter((m) => m.status === 'ACTIVE' && m.user.username.toLowerCase().includes(q));

  return (
    <QueryList
      title="Check-in"
      subtitle={`${inToday.size} checked in today`}
      query={members}
      items={items}
      keyExtractor={(m) => m.id}
      header={
        <>
          <Field label="Search members" placeholder="Name" value={search} onChangeText={setSearch} autoCorrect={false} />
          {notice ? (
            <Text color={colors.success} accessibilityLiveRegion="polite">
              {notice}
            </Text>
          ) : null}
          <FormError error={checkIn.error} />
        </>
      }
      renderItem={(m) => (
        <ListRow
          title={m.user.username}
          subtitle={m.membershipPlan?.name}
          right={
            inToday.has(m.id) ? (
              <StatusPill status="PRESENT" />
            ) : (
              <Button
                compact
                label="Check in"
                loading={checkIn.isPending && checkIn.variables === m.id}
                onPress={() => checkIn.mutate(m.id)}
              />
            )
          }
        />
      )}
      empty={{ title: 'No active members found', body: 'Only active members can be checked in.' }}
    />
  );
}
