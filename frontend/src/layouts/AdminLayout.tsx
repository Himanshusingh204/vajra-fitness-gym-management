import { useQuery } from '@tanstack/react-query';
import {
  Activity, BarChart3, Building2, CalendarDays, CreditCard, Diamond, FileText, Globe,
  Landmark, LayoutDashboard, LifeBuoy, MapPinned, MessageSquare, Users,
} from 'lucide-react';
import DashboardShell from '../components/shell/DashboardShell';
import { useAuthStore } from '../store/useAuthStore';
import { getPendingBranches } from '../api/branch.api';
import api from '../services/api';
import type { ChangeRequest } from '../api/gym.api';

export default function AdminLayout() {
  const email = useAuthStore((s) => s.user?.email);
  const { data: pendingBranches = [] } = useQuery({
    queryKey: ['pending-branches'],
    queryFn: getPendingBranches,
    refetchInterval: 30000,
  });
  // Same key as the approvals panel, so the two share one request.
  const { data: approvals = [] } = useQuery<ChangeRequest[]>({
    queryKey: ['admin-approvals'],
    queryFn: () => api.get('/admin/approvals').then((r) => r.data),
    refetchInterval: 30000,
  });
  const applications = approvals.filter((r) => r.type === 'GYM_REGISTRATION').length;

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
          { to: '/admin/approvals', id: 'branches', label: 'Approvals', icon: MapPinned, badge: pendingBranches.length + applications },
          { to: '/admin/users', id: 'users', label: 'Users', icon: Users },
          { to: '/admin/bookings', id: 'bookings', label: 'Bookings', icon: CalendarDays },
          { to: '/admin/website-requests', id: 'website-requests', label: 'Website requests', icon: Globe },
        ] },
        { label: 'Billing', links: [
          { to: '/admin/payments', id: 'payments', label: 'Payments', icon: CreditCard },
          { to: '/admin/finance', id: 'finance', label: 'Marketplace finance', icon: Landmark },
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
