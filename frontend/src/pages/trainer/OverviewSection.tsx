import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle, Clock, Dumbbell } from 'lucide-react';
import { getGymWorkoutSlips } from '../../api/workout.api';
import { PageHeader, StatTile } from '../../components/ui';
import { useAuthStore } from '../../store/useAuthStore';
import { localDateString } from '../../utils/format';
import { useTrainerBookings, useTrainerMe } from './useTrainer';

export default function OverviewSection() {
  const user = useAuthStore((s) => s.user);
  const { data: me } = useTrainerMe();
  const gymId = me?.trainerDetails?.gym?.id;
  const { data: bookings } = useTrainerBookings(true);
  const { data: slips } = useQuery({
    queryKey: ['gymSlips', gymId],
    queryFn: () => getGymWorkoutSlips(gymId),
    enabled: !!gymId,
  });

  const today = localDateString();
  const live = (bookings ?? []).filter((b: any) => b.status !== 'CANCELLED');
  const todayCount = live.filter((b: any) => b.date === today).length;
  const upcomingCount = live.filter((b: any) => b.date > today).length;
  const completedCount = (bookings ?? []).filter((b: any) => b.status === 'COMPLETED').length;
  const mySlips = (slips ?? []).filter((s: any) => s.trainer?.user?.username === user?.username).length;

  return (
    <>
      <PageHeader title="Overview" description={me?.trainerDetails?.gym?.name ? `Trainer at ${me.trainerDetails.gym.name}` : undefined} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Today's sessions" icon={Calendar} value={todayCount} />
        <StatTile label="Upcoming sessions" icon={Clock} value={upcomingCount} />
        <StatTile label="Slips assigned" icon={Dumbbell} value={mySlips} />
        <StatTile label="Completed sessions" icon={CheckCircle} value={completedCount} />
      </div>
    </>
  );
}
