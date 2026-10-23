import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getMemberWorkouts } from '@/api/gym';
import { Button } from '@/components/Button';
import { QueryList } from '@/components/QueryList';
import { WorkoutCard } from '@/components/WorkoutCard';

export default function ClientDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const slips = useQuery({ queryKey: ['member', 'workouts', id], queryFn: () => getMemberWorkouts(id) });

  return (
    <>
      <Stack.Screen options={{ title: name ?? 'Client' }} />
      <QueryList
        edges={['bottom']}
        query={slips}
        items={slips.data}
        keyExtractor={(s) => s.id}
        header={
          <Button
            label="Write a workout"
            icon="add"
            onPress={() => router.push({ pathname: '/new-workout', params: { memberId: id, name: name ?? '' } })}
          />
        }
        renderItem={(s) => <WorkoutCard slip={s} />}
        empty={{ title: 'No workouts yet', body: 'Plans you write for this client appear here.' }}
      />
    </>
  );
}
