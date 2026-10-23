import { Navigate, Route, Routes } from 'react-router';
import { CalendarClock, CalendarDays, ClipboardList, Clock, Dumbbell, Users, TrendingUp, XCircle } from 'lucide-react';
import { AppShell, type NavGroup } from '../../components/shell/AppShell';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { blockedCode, useTrainerBookings, useTrainerMe } from './useTrainer';
import OverviewSection from './OverviewSection';
import MembersSection from './MembersSection';
import SlipsSection from './SlipsSection';
import ClassesSection from './ClassesSection';
import ProgressSection from './ProgressSection';
import SessionsSection from './SessionsSection';

const nav: NavGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Overview', icon: ClipboardList, end: true },
      { to: '/dashboard/members', label: 'Members', icon: Users },
      { to: '/dashboard/slips', label: 'Workout slips', icon: Dumbbell },
      { to: '/dashboard/progress', label: 'Member progress', icon: TrendingUp },
      { to: '/dashboard/sessions', label: 'Sessions', icon: CalendarClock },
      { to: '/dashboard/classes', label: 'Classes', icon: CalendarDays },
    ],
  },
];

const mobileTabs = [nav[0].items[0], nav[0].items[1], nav[0].items[2], nav[0].items[4], nav[0].items[5]];

export default function TrainerArea() {
  const { data: me, isLoading } = useTrainerMe();
  const approved = me?.trainerStatus === 'ACTIVE';
  const bookings = useTrainerBookings(approved);

  const blocked = me?.trainerStatus === 'PENDING' || me?.trainerStatus === 'REJECTED' ? me.trainerStatus : blockedCode(bookings.error);

  if (isLoading) {
    return (
      <AppShell nav={[]} title="Trainer dashboard">
        <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-8" role="status" aria-label="Loading your dashboard">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppShell>
    );
  }

  if (blocked) {
    const pending = blocked === 'PENDING';
    return (
      <AppShell nav={[]} title="Trainer dashboard">
        <div className="mx-auto w-full max-w-xl p-4 sm:p-8">
          <EmptyState
            icon={pending ? Clock : XCircle}
            title={pending ? 'Your application is awaiting approval' : 'Your application was not approved'}
            description={
              pending
                ? `${me?.trainerDetails?.gym?.name ?? 'Your gym'} has to approve your trainer account before you can use the dashboard. Check back later.`
                : `${me?.trainerDetails?.gym?.name ?? 'The gym'} did not approve this trainer account. Contact the gym if you think this is a mistake.`
            }
            action={<Button to="/profile" variant="secondary">View profile</Button>}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell nav={nav} mobileTabs={mobileTabs} title="Trainer dashboard">
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
        <Routes>
          <Route index element={<OverviewSection />} />
          <Route path="members" element={<MembersSection />} />
          <Route path="slips" element={<SlipsSection />} />
          <Route path="progress" element={<ProgressSection />} />
          <Route path="sessions" element={<SessionsSection />} />
          <Route path="classes" element={<ClassesSection />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </AppShell>
  );
}
