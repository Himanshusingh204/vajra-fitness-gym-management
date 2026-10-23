import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { getTrainerBookings, updateBooking } from '@/api/gym';
import type { Booking, BookingStatus } from '@/api/types';
import { Button } from '@/components/Button';
import { Card, StatusPill } from '@/components/Card';
import { QueryList } from '@/components/QueryList';
import { Segmented } from '@/components/Segmented';
import { FormError } from '@/components/States';
import { Text } from '@/components/Text';
import { formatDate, localDateKey } from '@/lib/format';
import { space } from '@/theme';

export default function TrainerBookings() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');
  const bookings = useQuery({ queryKey: ['trainer', 'bookings'], queryFn: getTrainerBookings });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => updateBooking(id, status),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['trainer', 'bookings'] });
    },
  });

  const today = localDateKey();
  const items =
    filter === 'all'
      ? bookings.data
      : bookings.data?.filter((b) => b.date >= today && (b.status === 'PENDING' || b.status === 'CONFIRMED'));

  const action = (b: Booking, status: BookingStatus, label: string, variant: 'primary' | 'secondary' | 'danger') => (
    <View style={styles.flex}>
      <Button
        compact
        label={label}
        variant={variant}
        loading={update.isPending && update.variables?.id === b.id && update.variables.status === status}
        onPress={() => update.mutate({ id: b.id, status })}
      />
    </View>
  );

  return (
    <QueryList
      title="Bookings"
      query={bookings}
      items={items}
      keyExtractor={(b) => b.id}
      header={
        <>
          <Segmented
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'all', label: 'All' },
            ]}
          />
          <FormError error={update.error} />
        </>
      }
      renderItem={(b) => (
        <Card>
          <View style={styles.between}>
            <Text variant="label">{b.user.username}</Text>
            <StatusPill status={b.status} />
          </View>
          <Text muted>
            {formatDate(b.date)} at {b.time}
          </Text>
          {b.notes ? <Text variant="small" muted>{b.notes}</Text> : null}
          {b.status === 'PENDING' && (
            <View style={styles.row}>
              {action(b, 'CANCELLED', 'Decline', 'danger')}
              {action(b, 'CONFIRMED', 'Confirm', 'primary')}
            </View>
          )}
          {b.status === 'CONFIRMED' && (
            <View style={styles.row}>
              {action(b, 'CANCELLED', 'Cancel', 'danger')}
              {action(b, 'COMPLETED', 'Mark done', 'primary')}
            </View>
          )}
        </Card>
      )}
      empty={{ title: 'No bookings', body: 'Personal training sessions members book with you appear here.' }}
    />
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
