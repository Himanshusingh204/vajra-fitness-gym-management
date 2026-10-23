import { QueryList } from '@/components/QueryList';
import { WorkoutCard } from '@/components/WorkoutCard';
import { useMemberProfile, useMyWorkouts } from '@/hooks/useMemberData';

export default function MemberWorkouts() {
  const profile = useMemberProfile();
  const workouts = useMyWorkouts(profile.data?.id);

  return (
    <QueryList
      title="Workouts"
      subtitle="Plans from your trainer, newest first."
      query={profile.data ? workouts : profile}
      items={workouts.data}
      keyExtractor={(s) => s.id}
      renderItem={(slip) => <WorkoutCard slip={slip} />}
      empty={
        profile.data === null
          ? { title: 'No gym yet', body: 'Join a gym from the Home tab to get workout plans.' }
          : { title: 'No workouts yet', body: 'When your trainer assigns a plan it shows up here.' }
      }
    />
  );
}
