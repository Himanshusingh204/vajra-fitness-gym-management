import { Navigate, Route, Routes } from 'react-router';
import { CalendarDays, UserPlus, Users } from 'lucide-react';
import { AppShell, type NavGroup } from '../../components/shell/AppShell';
import CheckInSection from './CheckInSection';
import AttendanceSection from './AttendanceSection';
import MembersSection from './MembersSection';

const nav: NavGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Check-in', icon: UserPlus, end: true },
      { to: '/dashboard/attendance', label: "Today's attendance", icon: CalendarDays },
      { to: '/dashboard/members', label: 'Member lookup', icon: Users },
    ],
  },
];

export default function StaffArea() {
  return (
    <AppShell nav={nav} mobileTabs={nav[0].items} title="Staff dashboard">
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
        <Routes>
          <Route index element={<CheckInSection />} />
          <Route path="attendance" element={<AttendanceSection />} />
          <Route path="members" element={<MembersSection />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </AppShell>
  );
}
