import { RoleTabs } from '@/components/RoleTabs';

export default function PartnerLayout() {
  return (
    <RoleTabs
      role="GYM_ADMIN"
      tabs={[
        { name: 'index', title: 'Today', icon: 'today-outline' },
        { name: 'members', title: 'Members', icon: 'people-outline' },
        { name: 'fees', title: 'Fees', icon: 'cash-outline' },
        { name: 'check-in', title: 'Check-in', icon: 'checkmark-circle-outline' },
        { name: 'profile', title: 'Profile', icon: 'person-circle-outline' },
      ]}
    />
  );
}
