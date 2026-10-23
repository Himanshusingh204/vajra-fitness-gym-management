import TabbedSection from './TabbedSection';
import MembersPanel from './MembersPanel';
import MembershipsPanel from './MembershipsPanel';

export default function MembersPage() {
  return (
    <TabbedSection
      id="members"
      label="Member views"
      tabs={[
        { id: 'members', label: 'Members', content: <MembersPanel /> },
        { id: 'memberships', label: 'Memberships', content: <MembershipsPanel /> },
      ]}
    />
  );
}
