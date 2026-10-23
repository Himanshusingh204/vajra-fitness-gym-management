import { useQuery } from '@tanstack/react-query';
import { Download, Dumbbell } from 'lucide-react';
import { getMyWorkouts } from '../../api/member.api';
import { ExercisePlanView } from '../../components/ExercisePlan';
import { Button, Card, EmptyState, PageHeader, Skeleton } from '../../components/ui';
import { downloadFile } from '../../services/api';
import { ActivityChart } from './ActivityChart';
import { useMemberProfile } from './useMemberProfile';

// Workout slips assigned per month, last 6 months.
const monthlyWorkouts = (slips: { assignedDate: string }[]) => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
    const value = slips.filter((w) => {
      const a = new Date(w.assignedDate);
      return a.getMonth() === d.getMonth() && a.getFullYear() === d.getFullYear();
    }).length;
    return { label: d.toLocaleDateString('en-IN', { month: 'short' }), value };
  });
};

export default function WorkoutsSection() {
  const { data: profile } = useMemberProfile();
  const { data: workouts, isLoading } = useQuery({
    queryKey: ['myWorkouts', profile?.id],
    queryFn: () => getMyWorkouts(profile?.id),
    enabled: !!profile?.id,
    refetchInterval: 60000,
  });

  return (
    <>
      <PageHeader title="Workouts" description="Workout slips your trainer has assigned to you." />

      <Card>
        <h2 className="font-semibold text-ink">Plans assigned, last 6 months</h2>
        <div className="mt-3">
          <ActivityChart data={monthlyWorkouts(workouts ?? [])} label="Workout plans assigned per month over the last 6 months" />
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !workouts || workouts.length === 0 ? (
        <Card><EmptyState icon={Dumbbell} title="No workouts assigned yet" description="Ask your trainer to create a slip for you." /></Card>
      ) : (
        <ul className="space-y-4">
          {workouts.map((slip: any) => (
            <li key={slip.id}>
              <Card>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{slip.title || 'Workout plan'}</h2>
                    <p className="text-sm text-ink-muted">Assigned by {slip.trainer?.user?.username || 'gym admin'}</p>
                  </div>
                  <Button variant="secondary" size="sm" icon={Download} onClick={() => downloadFile(`/workouts/${slip.id}/pdf`, `workout-${slip.id.slice(0, 8)}.pdf`)}>
                    PDF
                  </Button>
                </div>
                <div className="rounded-control bg-surface-sunken p-4">
                  <ExercisePlanView exercises={slip.exercises} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
