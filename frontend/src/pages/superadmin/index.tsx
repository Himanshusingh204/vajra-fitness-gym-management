import { Navigate, Route, Routes } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Building2,
  CreditCard,
  Diamond,
  LayoutDashboard,
  LifeBuoy,
  MapPinned,
  MessageSquare,
  ScrollText,
  Users as UsersIcon,
} from 'lucide-react';
import { AppShell, type NavGroup } from '../../components/shell/AppShell';
import { getPendingBranches } from '../../api/branch.api';
import Overview from './Overview';
import Gyms from './Gyms';
import Branches from './Branches';
import Users from './Users';
import Payments from './Payments';
import Billing from './Billing';
import Content from './Content';
import { Messages, Tickets } from './Support';
import Audit from './Audit';

const BASE = '/admin/super';

export default function SuperAdminArea() {
  const { data: pending = [] } = useQuery({ queryKey: ['pending-branches'], queryFn: getPendingBranches, refetchInterval: 30000 });

  const nav: NavGroup[] = [
    { items: [{ to: BASE, label: 'Overview', icon: BarChart3, end: true }] },
    {
      label: 'Platform',
      items: [
        { to: `${BASE}/gyms`, label: 'Gyms', icon: Building2 },
        { to: `${BASE}/branches`, label: 'Branch approvals', icon: MapPinned, badge: pending.length },
        { to: `${BASE}/users`, label: 'Users', icon: UsersIcon },
      ],
    },
    {
      label: 'Billing',
      items: [
        { to: `${BASE}/payments`, label: 'Payments', icon: CreditCard },
        { to: `${BASE}/subscriptions`, label: 'Plans and subscriptions', icon: Diamond },
      ],
    },
    {
      label: 'Content and support',
      items: [
        { to: `${BASE}/content`, label: 'Content', icon: LayoutDashboard },
        { to: `${BASE}/support`, label: 'Support tickets', icon: LifeBuoy },
        { to: `${BASE}/messages`, label: 'Contact messages', icon: MessageSquare },
        { to: `${BASE}/audit`, label: 'Audit log', icon: ScrollText },
      ],
    },
  ];

  const mobileTabs = [nav[0].items[0], nav[1].items[0], nav[1].items[1], nav[1].items[2], nav[2].items[1]];

  return (
    <AppShell nav={nav} mobileTabs={mobileTabs} title="Super admin">
      <Routes>
        <Route index element={<Overview />} />
        <Route path="gyms" element={<Gyms />} />
        <Route path="branches" element={<Branches />} />
        <Route path="users" element={<Users />} />
        <Route path="payments" element={<Payments />} />
        <Route path="subscriptions" element={<Billing />} />
        <Route path="content" element={<Content />} />
        <Route path="support" element={<Tickets />} />
        <Route path="messages" element={<Messages />} />
        <Route path="audit" element={<Audit />} />
        <Route path="*" element={<Navigate to={BASE} replace />} />
      </Routes>
    </AppShell>
  );
}
