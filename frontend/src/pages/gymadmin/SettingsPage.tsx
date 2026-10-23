import TabbedSection from './TabbedSection';
import ProfilePanel from './ProfilePanel';
import BranchesPanel from './BranchesPanel';
import { useGym } from './GymContext';

export default function SettingsPage() {
  const { gym } = useGym();
  return (
    <TabbedSection
      id="settings"
      label="Gym settings"
      tabs={[
        // keyed so the form starts from the saved values once the gym has loaded
        { id: 'profile', label: 'Gym profile', content: <ProfilePanel key={gym.id} /> },
        { id: 'branches', label: 'Branches', content: <BranchesPanel /> },
      ]}
    />
  );
}
