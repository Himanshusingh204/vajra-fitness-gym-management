import { Navigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useGymSite } from './gymData';
import { GymPageIntro, JoinBand, Section, Timetable, TrainerList } from './shared';

export default function GymTrainersPage() {
  const { gym, base, joinUrl } = useGymSite();
  usePageMeta(`Trainers at ${gym.name}`, `Meet the trainers and see the class timetable at ${gym.name} in ${gym.city}.`, `/gyms/${gym.id}/trainers`);
  if (gym.trainers.length === 0) return <Navigate to={base} replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <GymPageIntro eyebrow="Meet the team" title="Good coaching changes everything." description={`Meet the people behind your training at ${gym.name}. Find a coaching style that helps you feel confident and keep making progress.`} />
      <Section title="Trainers">
        <TrainerList trainers={gym.trainers} />
      </Section>
      {gym.classes.length > 0 && (
        <Section title="Class timetable">
          <Timetable classes={gym.classes} />
        </Section>
      )}
      <JoinBand gym={gym} joinUrl={joinUrl} />
    </div>
  );
}
