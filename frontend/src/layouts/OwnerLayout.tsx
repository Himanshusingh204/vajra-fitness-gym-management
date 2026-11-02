import { useQuery } from '@tanstack/react-query';
import {
  Banknote, BarChart3, Bell, Building2, Calendar, CalendarDays, ClipboardCheck, ClipboardList,
  CreditCard, Diamond, Dumbbell, Gift, HandCoins, LifeBuoy, Megaphone, Package, PieChart, Settings,
  Shield, Sparkles, Store, UserCog, Users, Wallet, Wrench,
} from 'lucide-react';
import DashboardShell from '../components/shell/DashboardShell';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

export default function OwnerLayout() {
  const email = useAuthStore((s) => s.user?.email);
  // Same keys as the console pages, so these share one request with them.
  const { data: branch, isLoading } = useQuery({
    queryKey: ['my-branch'],
    queryFn: () => api.get('/gym/my-branch').then((r) => r.data),
    refetchInterval: 60000,
  });
  const { data: stats } = useQuery<{ pendingMembers: number }>({
    queryKey: ['gym-stats', branch?.id],
    queryFn: () => api.get(`/gym/${branch?.id}/stats`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  return (
    <DashboardShell
      title={isLoading ? 'Loading…' : branch?.name || 'Gym console'}
      subtitle={email}
      tabBar={['/owner', '/owner/members', '/owner/bookings', '/owner/attendance']}
      groups={[
        { label: 'Overview', links: [
          { to: '/owner', id: 'overview', label: 'Overview', icon: Building2 },
          { to: '/owner/analytics', id: 'analytics', label: 'Analytics', icon: PieChart },
          { to: '/owner/reports', id: 'reports', label: 'Reports', icon: BarChart3 },
        ] },
        { label: 'Your gym', links: [
          { to: '/owner/profile', id: 'profile', label: 'Gym profile', icon: Store },
          { to: '/owner/plans', id: 'plans', label: 'Plans & pricing', icon: Diamond },
          { to: '/owner/equipment', id: 'equipment', label: 'Equipment', icon: Wrench },
          { to: '/owner/settings', id: 'branch', label: 'Settings', icon: Settings },
          { to: '/owner/subscription', id: 'subscription', label: 'Kavach subscription', icon: Sparkles },
        ] },
        { label: 'People', links: [
          { to: '/owner/members', id: 'members', label: 'Members', icon: Users, badge: stats?.pendingMembers },
          { to: '/owner/trainers', id: 'trainers', label: 'Trainers', icon: Shield },
          { to: '/owner/staff', id: 'staff', label: 'Staff', icon: UserCog },
          { to: '/owner/enquiries', id: 'enquiries', label: 'Enquiries', icon: ClipboardList },
        ] },
        { label: 'Training', links: [
          { to: '/owner/classes', id: 'classes', label: 'Classes & schedule', icon: CalendarDays },
          { to: '/owner/bookings', id: 'bookings', label: 'Bookings', icon: Calendar },
          { to: '/owner/workouts', id: 'workouts', label: 'Workouts', icon: Dumbbell },
          { to: '/owner/attendance', id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
        ] },
        { label: 'Money', links: [
          { to: '/owner/memberships', id: 'memberships', label: 'Memberships', icon: ClipboardCheck },
          { to: '/owner/fees', id: 'fees', label: 'Fees', icon: CreditCard },
          { to: '/owner/earnings', id: 'earnings', label: 'Earnings', icon: HandCoins },
          { to: '/owner/expenses', id: 'expenses', label: 'Expenses', icon: Wallet },
          { to: '/owner/payroll', id: 'payroll', label: 'Payroll', icon: Banknote },
          { to: '/owner/inventory', id: 'inventory', label: 'Inventory & POS', icon: Package },
        ] },
        { label: 'Engagement', links: [
          { to: '/owner/notices', id: 'notices', label: 'Notices', icon: Megaphone },
          { to: '/owner/notifications', id: 'notifications', label: 'Notifications', icon: Bell },
          { to: '/owner/referrals', id: 'referrals', label: 'Referrals', icon: Gift },
          { to: '/owner/support', id: 'support', label: 'Support', icon: LifeBuoy },
        ] },
      ]}
    />
  );
}
