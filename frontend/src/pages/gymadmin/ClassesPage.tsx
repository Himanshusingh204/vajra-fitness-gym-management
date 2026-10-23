import TabbedSection from './TabbedSection';
import ClassesTab from './ClassesTab';
import BookingsPanel from './BookingsPanel';
import WorkoutsPanel from './WorkoutsPanel';
import { useGym } from './GymContext';

export default function ClassesPage() {
  const { gym } = useGym();
  return (
    <TabbedSection
      id="classes"
      label="Training"
      tabs={[
        { id: 'classes', label: 'Group classes', content: <ClassesTab gymId={gym.id} /> },
        { id: 'bookings', label: 'PT bookings', content: <BookingsPanel /> },
        { id: 'workouts', label: 'Workout slips', content: <WorkoutsPanel /> },
      ]}
    />
  );
}
