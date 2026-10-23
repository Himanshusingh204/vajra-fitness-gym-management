import { Navigate, Route, Routes } from 'react-router';
import { Bell, Building2, CalendarDays, CreditCard, Dumbbell, LayoutDashboard, Megaphone, Salad, TrendingUp, Users, UsersRound } from 'lucide-react';
import { AppShell, type NavGroup } from '../../components/shell/AppShell';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { useMemberProfile } from './useMemberProfile';
import OverviewSection from './OverviewSection';
import MembershipSection from './MembershipSection';
import AttendanceSection from './AttendanceSection';
import WorkoutsSection from './WorkoutsSection';
import ProgressSection from './ProgressSection';
import NutritionSection from './NutritionSection';
import TrainingSection from './TrainingSection';
import ClassesSection from './ClassesSection';
import PaymentsSection from './PaymentsSection';
import NoticesSection from './NoticesSection';
import NotificationsSection from './NotificationsSection';

const nav: NavGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/dashboard/membership', label: 'Membership', icon: Building2 },
    ],
  },
  {
    label: 'Training',
    items: [
      { to: '/dashboard/attendance', label: 'Attendance', icon: CalendarDays },
      { to: '/dashboard/workouts', label: 'Workouts', icon: Dumbbell },
      { to: '/dashboard/progress', label: 'Progress', icon: TrendingUp },
      { to: '/dashboard/nutrition', label: 'Nutrition', icon: Salad },
      { to: '/dashboard/training', label: 'Personal training', icon: Users },
      { to: '/dashboard/classes', label: 'Group classes', icon: UsersRound },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/dashboard/payments', label: 'Payments', icon: CreditCard },
      { to: '/dashboard/notices', label: 'Notices', icon: Megaphone },
      { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

const mobileTabs = [nav[0].items[0], nav[1].items[0], nav[1].items[1], nav[2].items[0], nav[2].items[2]];

export default function MemberArea() {
  const { isLoading, isError } = useMemberProfile();

  return (
    <AppShell nav={isError ? [] : nav} mobileTabs={isError ? undefined : mobileTabs} title="Member dashboard">
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
        {isLoading ? (
          <div className="space-y-4" role="status" aria-label="Loading your dashboard">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <EmptyState
            icon={Building2}
            title="You have not joined a gym yet"
            description="Browse gyms near you and send a membership request when you are ready."
            action={<Button to="/membership">Find a gym</Button>}
          />
        ) : (
          <Routes>
            <Route index element={<OverviewSection />} />
            <Route path="membership" element={<MembershipSection />} />
            <Route path="attendance" element={<AttendanceSection />} />
            <Route path="workouts" element={<WorkoutsSection />} />
            <Route path="progress" element={<ProgressSection />} />
            <Route path="nutrition" element={<NutritionSection />} />
            <Route path="training" element={<TrainingSection />} />
            <Route path="classes" element={<ClassesSection />} />
            <Route path="payments" element={<PaymentsSection />} />
            <Route path="notices" element={<NoticesSection />} />
            <Route path="notifications" element={<NotificationsSection />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        )}
      </div>
    </AppShell>
  );
}
