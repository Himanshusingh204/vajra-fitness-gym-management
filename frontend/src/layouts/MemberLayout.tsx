import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  Activity, Bell, Building2, CalendarDays, CreditCard, Dumbbell, MapPin, Salad, TrendingUp,
  UserCircle, Users,
} from 'lucide-react';
import DashboardShell from '../components/shell/DashboardShell';
import { getMyGyms } from '../api/member.api';
import { useAuthStore } from '../store/useAuthStore';
import { useGymStore } from '../store/useGymStore';

// Every member query is about one gym, so drop what we have rather than show the old gym's data.
const pickGym = (queryClient: QueryClient, gymId: string | null) => {
  useGymStore.getState().setGymId(gymId);
  queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== 'myGyms' });
};

function GymSwitcher() {
  const queryClient = useQueryClient();
  const gymId = useGymStore((s) => s.gymId);
  const { data: gyms = [] } = useQuery({ queryKey: ['myGyms'], queryFn: getMyGyms, staleTime: 60_000 });

  // A gym saved in this browser that the account no longer belongs to (or another account's pick).
  const stale = !!gymId && gyms.length > 0 && !gyms.some((g) => g.gymId === gymId);
  useEffect(() => {
    if (stale) pickGym(queryClient, null);
  }, [stale, queryClient]);

  if (gyms.length < 2) return null;

  return (
    <select
      aria-label="Gym"
      value={stale ? gyms[0].gymId : gymId ?? gyms[0].gymId}
      onChange={(e) => pickGym(queryClient, e.target.value)}
      className="input-field min-h-11 truncate py-2 font-semibold"
    >
      {gyms.map((g) => (
        <option key={g.gymId} value={g.gymId}>
          {g.gym.name}{g.status === 'ACTIVE' ? '' : ` (${g.status.toLowerCase()})`}
        </option>
      ))}
    </select>
  );
}

export default function MemberLayout() {
  const user = useAuthStore((s) => s.user);

  return (
    <DashboardShell
      title={user?.username ?? 'Member'}
      subtitle={user?.email}
      switcher={<GymSwitcher />}
      tabBar={['/dashboard', '/bookings', '/notifications', '/profile']}
      groups={[
        { label: 'You', links: [
          { to: '/dashboard', id: 'overview', label: 'Home', icon: Activity },
          { to: '/bookings', id: 'pt', label: 'Bookings', icon: Users },
          { to: '/notifications', id: 'notifications', label: 'Alerts', icon: Bell },
          { to: '/profile', id: 'settings', label: 'Profile', icon: UserCircle },
        ] },
        { label: 'Membership', links: [
          { to: '/dashboard/membership', id: 'membership', label: 'My membership', icon: Building2 },
          { to: '/dashboard/payments', id: 'fees', label: 'Payments', icon: CreditCard },
          { to: '/dashboard/attendance', id: 'attendance', label: 'Attendance', icon: CalendarDays },
        ] },
        { label: 'Training', links: [
          { to: '/dashboard/workouts', id: 'workouts', label: 'My workouts', icon: Dumbbell },
          { to: '/dashboard/classes', id: 'classes', label: 'Group classes', icon: CalendarDays },
          { to: '/dashboard/progress', id: 'progress', label: 'My progress', icon: TrendingUp },
          { to: '/dashboard/nutrition', id: 'nutrition', label: 'Nutrition', icon: Salad },
        ] },
        { label: 'Explore', links: [
          { to: '/dashboard/gyms', id: 'gyms', label: 'Find gyms', icon: MapPin },
        ] },
      ]}
    />
  );
}
