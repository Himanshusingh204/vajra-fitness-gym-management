import { useQuery } from '@tanstack/react-query';
import {
  Activity, BarChart3, Building2, CalendarDays, CreditCard, Diamond, FileText, Globe,
  LayoutDashboard, LifeBuoy, MapPinned, MessageSquare, Users,
} from 'lucide-react';
import DashboardShell from '../components/shell/DashboardShell';
import { useAuthStore } from '../store/useAuthStore';
import { getPendingBranches } from '../api/branch.api';

export default function AdminLayout() {
  const email = useAuthStore((s) => s.user?.email);
  const { data: pendingBranches = [] } = useQuery({
    queryKey: ['pending-branches'],
    queryFn: getPendingBranches,
    refetchInterval: 30000,
  });

  return (
    <DashboardShell
      title="Platform Control"
      subtitle={<>Signed in as <strong>{email}</strong></>}
      tabBar={['/admin', '/admin/gyms', '/admin/approvals', '/admin/users']}
      groups={[
        { label: 'Overview', links: [
          { to: '/admin', id: 'analytics', label: 'Overview', icon: BarChart3 },
        ] },
        { label: 'Platform', links: [
          { to: '/admin/gyms', id: 'gyms', label: 'Gyms', icon: Building2 },
          { to: '/admin/approvals', id: 'branches', label: 'Approvals', icon: MapPinned, badge: pendingBranches.length },
          { to: '/admin/users', id: 'users', label: 'Users', icon: Users },
          { to: '/admin/bookings', id: 'bookings', label: 'Bookings', icon: CalendarDays },
          { to: '/admin/website-requests', id: 'website-requests', label: 'Website requests', icon: Globe },
        ] },
        { label: 'Billing', links: [
          { to: '/admin/payments', id: 'payments', label: 'Payments', icon: CreditCard },
          { to: '/admin/subscriptions', id: 'saas', label: 'SaaS & subscriptions', icon: Diamond },
        ] },
        { label: 'Content & support', links: [
          { to: '/admin/content', id: 'cms', label: 'Content (CMS)', icon: LayoutDashboard },
          { to: '/admin/support', id: 'support', label: 'Support', icon: LifeBuoy },
          { to: '/admin/messages', id: 'messages', label: 'Contact messages', icon: MessageSquare },
        ] },
        { label: 'System', links: [
          { to: '/admin/audit', id: 'audit', label: 'Audit log', icon: FileText },
          { to: '/admin/system', id: 'system', label: 'System status', icon: Activity },
        ] },
      ]}
    />
  );
}
