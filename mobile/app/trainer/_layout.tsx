import { RoleTabs } from '@/components/RoleTabs';

export default function TrainerLayout() {
  return (
    <RoleTabs
      role="TRAINER"
      tabs={[
        { name: 'index', title: 'Clients', icon: 'people-outline' },
        { name: 'bookings', title: 'Bookings', icon: 'calendar-outline' },
        { name: 'workouts', title: 'Workouts', icon: 'barbell-outline' },
        { name: 'profile', title: 'Profile', icon: 'person-circle-outline' },
      ]}
    />
  );
}
