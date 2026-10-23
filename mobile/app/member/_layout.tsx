import { RoleTabs } from '@/components/RoleTabs';

export default function MemberLayout() {
  return (
    <RoleTabs
      role="MEMBER"
      tabs={[
        { name: 'index', title: 'Home', icon: 'home-outline' },
        { name: 'workouts', title: 'Workouts', icon: 'barbell-outline' },
        { name: 'attendance', title: 'Attendance', icon: 'calendar-outline' },
        { name: 'payments', title: 'Payments', icon: 'card-outline' },
        { name: 'profile', title: 'Profile', icon: 'person-circle-outline' },
      ]}
    />
  );
}
