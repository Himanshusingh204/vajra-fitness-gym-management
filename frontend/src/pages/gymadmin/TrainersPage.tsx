import { useQuery } from '@tanstack/react-query';
import TabbedSection from './TabbedSection';
import TeamPanel from './TeamPanel';
import ApplicationsPanel from './ApplicationsPanel';
import { getTrainerApplications } from '../../api/gymAdmin.api';
import { useGym } from './GymContext';

export default function TrainersPage() {
  const { gym } = useGym();
  const gymId = gym?.id ?? '';
  const { data: pending = [] } = useQuery({
    queryKey: ['trainer-applications', gymId, 'PENDING'],
    queryFn: () => getTrainerApplications(gymId, 'PENDING'),
    enabled: !!gymId,
  });
  return (
    <TabbedSection
      id="trainers"
      label="Trainers and staff"
      tabs={[
        { id: 'team', label: 'Team', content: <TeamPanel /> },
        { id: 'applications', label: 'Applications', count: pending.length, content: <ApplicationsPanel /> },
      ]}
    />
  );
}
