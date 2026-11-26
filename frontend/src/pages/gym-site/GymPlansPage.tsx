import { Navigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useGymSite } from './gymData';
import { GymPageIntro, JoinBand, PlanGrid } from './shared';

export default function GymPlansPage() {
  const { gym, base, joinUrl } = useGymSite();
  usePageMeta(`Membership plans at ${gym.name}`, `Prices and durations for every membership plan at ${gym.name} in ${gym.city}.`, `/gyms/${gym.id}/plans`);
  if (gym.plans.length === 0) return <Navigate to={base} replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <GymPageIntro
        eyebrow="Membership"
        title="Plans and prices"
        description={`${gym.plans.length} ${gym.plans.length === 1 ? 'plan' : 'plans'} at ${gym.name}. Pick one and send a join request, and the gym confirms your start date.`}
        photo={1}
      />
      <div className="mt-10 md:mt-14">
        <PlanGrid plans={gym.plans} gymId={gym.id} />
      </div>
      <JoinBand gym={gym} joinUrl={joinUrl} />
    </div>
  );
}
