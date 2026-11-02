import { useQuery } from '@tanstack/react-query';
import { Calendar, CalendarDays, ClipboardList, Dumbbell, TrendingUp, Users, Wallet } from 'lucide-react';
import DashboardShell from '../components/shell/DashboardShell';
import { useAuthStore } from '../store/useAuthStore';
import { getMe } from '../api/auth.api';

export default function TrainerLayout() {
  const username = useAuthStore((s) => s.user?.username);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const gymName = me?.trainerDetails?.gym?.name;

  return (
    <DashboardShell
      title="Trainer Portal"
      subtitle={gymName ? `${username} · ${gymName}` : username}
      tabBar={['/trainer', '/trainer/clients', '/trainer/schedule', '/trainer/earnings']}
      groups={[
        { label: 'Today', links: [
          { to: '/trainer', id: 'overview', label: 'Overview', icon: ClipboardList },
          { to: '/trainer/schedule', id: 'schedule', label: 'Schedule', icon: CalendarDays },
          { to: '/trainer/bookings', id: 'bookings', label: 'Session bookings', icon: Calendar },
        ] },
        { label: 'Clients', links: [
          { to: '/trainer/clients', id: 'clients', label: 'Clients', icon: Users },
          { to: '/trainer/workouts', id: 'workouts', label: 'Workout slips', icon: Dumbbell },
          { to: '/trainer/progress', id: 'progress', label: 'Member progress', icon: TrendingUp },
        ] },
        { label: 'Money', links: [
          { to: '/trainer/earnings', id: 'earnings', label: 'Earnings', icon: Wallet },
        ] },
      ]}
    />
  );
}
