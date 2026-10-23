import { RoleTabs } from '@/components/RoleTabs';

export default function StaffLayout() {
  return (
    <RoleTabs
      role="STAFF"
      tabs={[
        { name: 'index', title: 'Check-in', icon: 'checkmark-circle-outline' },
        { name: 'members', title: 'Members', icon: 'people-outline' },
        { name: 'profile', title: 'Profile', icon: 'person-circle-outline' },
      ]}
    />
  );
}
