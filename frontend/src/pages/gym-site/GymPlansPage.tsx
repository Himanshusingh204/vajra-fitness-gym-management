import { Navigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useGymSite } from './gymData';
import { GymPageIntro, JoinBand, PlanGrid, Section } from './shared';

export default function GymPlansPage() {
  const { gym, base, joinUrl } = useGymSite();
  usePageMeta(`Membership plans at ${gym.name}`, `Prices and durations for every membership plan at ${gym.name} in ${gym.city}.`, `/gyms/${gym.id}/plans`);
  if (gym.plans.length === 0) return <Navigate to={base} replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <GymPageIntro eyebrow="Membership" title="Choose a plan that moves with you." description={`Clear membership options at ${gym.name}. Compare duration and pricing, then send your request online.`} />
      <Section title="Membership plans">
        <PlanGrid plans={gym.plans} gymId={gym.id} />
      </Section>
      <JoinBand gym={gym} joinUrl={joinUrl} />
    </div>
  );
}
