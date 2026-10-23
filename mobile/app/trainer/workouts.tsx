import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGymWorkouts } from '@/api/gym';
import { QueryList } from '@/components/QueryList';
import { Segmented } from '@/components/Segmented';
import { WorkoutCard } from '@/components/WorkoutCard';
import { useWorkGym } from '@/hooks/useWorkGym';
import { useUser } from '@/providers/AuthProvider';

export default function TrainerWorkouts() {
  const gymId = useWorkGym();
  const user = useUser();
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');
  const slips = useQuery({ queryKey: ['gym', gymId, 'workouts'], queryFn: () => getGymWorkouts(gymId!), enabled: !!gymId });
  const items = filter === 'all' ? slips.data : slips.data?.filter((s) => s.trainer?.user.username === user.username);

  return (
    <QueryList
      title="Workouts"
      subtitle="Open a client to write a new plan."
      query={slips}
      items={items}
      keyExtractor={(s) => s.id}
      header={
        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'mine', label: 'Mine' },
            { value: 'all', label: 'Whole gym' },
          ]}
        />
      }
      renderItem={(s) => <WorkoutCard slip={s} showMember />}
      empty={{ title: 'No workout plans yet' }}
    />
  );
}
