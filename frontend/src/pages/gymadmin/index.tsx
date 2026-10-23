import { lazy, Suspense, useState, type ComponentType, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote, Bell, Building2, CalendarDays, ClipboardList, CreditCard, Diamond, Gift, LayoutDashboard,
  Megaphone, Package, Settings, Shield, Sparkles, Users, UserCheck, Wallet, Wrench, BarChart3, type LucideIcon,
} from 'lucide-react';
import api from '../../services/api';
import { AppShell, type NavGroup } from '../../components/shell/AppShell';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageLoader } from '../../components/PageLoader';
import { EmptyState, PageHeader } from '../../components/ui';
import { getBranches, type GymBranch } from '../../api/branch.api';
import { getTrainerApplications } from '../../api/gymAdmin.api';
import { GymContext, useGym, type ConfirmRequest, type GymInfo } from './GymContext';
import type { GymStats } from './types';

const OverviewPage = lazy(() => import('./OverviewPage'));
const MembersPage = lazy(() => import('./MembersPage'));
const TrainersPage = lazy(() => import('./TrainersPage'));
const AttendancePage = lazy(() => import('./AttendancePage'));
const EnquiriesPage = lazy(() => import('./EnquiriesPage'));
const PlansPage = lazy(() => import('./PlansPage'));
const FeesPage = lazy(() => import('./FeesPage'));
const ExpensesTab = lazy(() => import('./ExpensesTab'));
const PayrollTab = lazy(() => import('./PayrollTab'));
const ClassesPage = lazy(() => import('./ClassesPage'));
const InventoryTab = lazy(() => import('./InventoryTab'));
const EquipmentPage = lazy(() => import('./EquipmentPage'));
const NoticesPage = lazy(() => import('./NoticesPage'));
const ReferralsPage = lazy(() => import('./ReferralsPage'));
const NotificationsPage = lazy(() => import('./NotificationsPage'));
const ReportsPage = lazy(() => import('./ReportsPage'));
const SubscriptionPage = lazy(() => import('./SubscriptionPage'));
const SettingsPage = lazy(() => import('./SettingsPage'));

function WithGymId({ view: View }: { view: ComponentType<{ gymId: string }> }) {
  return <View gymId={useGym().gym.id} />;
}

type Section = { path: string; title: string; description: string; icon: LucideIcon; element: ReactNode };

const overview: Section = { path: '', title: 'Overview', description: 'What needs doing today and how the gym is doing.', icon: LayoutDashboard, element: <OverviewPage /> };

const groups: { label?: string; sections: Section[] }[] = [
  { sections: [overview] },
  {
    label: 'People',
    sections: [
      { path: 'members', title: 'Members', description: 'Join requests, memberships and renewals.', icon: Users, element: <MembersPage /> },
      { path: 'trainers', title: 'Trainers and staff', description: 'Your team, and trainers who applied to join.', icon: Shield, element: <TrainersPage /> },
      { path: 'attendance', title: 'Attendance', description: 'Check members and staff in and see who is here today.', icon: ClipboardList, element: <AttendancePage /> },
      { path: 'enquiries', title: 'Enquiries', description: 'People who asked about joining.', icon: UserCheck, element: <EnquiriesPage /> },
    ],
  },
  {
    label: 'Money',
    sections: [
      { path: 'plans', title: 'Membership plans', description: 'Plans members can join. Published plans appear on your public page.', icon: Diamond, element: <PlansPage /> },
      { path: 'fees', title: 'Fees and payments', description: 'Record, collect, refund and export fees.', icon: CreditCard, element: <FeesPage /> },
      { path: 'expenses', title: 'Expenses', description: 'Rent, utilities and other running costs.', icon: Wallet, element: <WithGymId view={ExpensesTab} /> },
      { path: 'payroll', title: 'Payroll', description: 'Payslips for trainers and staff.', icon: Banknote, element: <WithGymId view={PayrollTab} /> },
    ],
  },
  {
    label: 'Operations',
    sections: [
      { path: 'classes', title: 'Classes and training', description: 'Group classes, personal training bookings and workout slips.', icon: CalendarDays, element: <ClassesPage /> },
      { path: 'inventory', title: 'Inventory and sales', description: 'Products, stock levels and point of sale.', icon: Package, element: <WithGymId view={InventoryTab} /> },
      { path: 'equipment', title: 'Equipment', description: 'Track equipment, condition and value.', icon: Wrench, element: <EquipmentPage /> },
    ],
  },
  {
    label: 'Engagement',
    sections: [
      { path: 'notices', title: 'Notices', description: 'Announcements shown to members, trainers and staff.', icon: Megaphone, element: <NoticesPage /> },
      { path: 'referrals', title: 'Referrals', description: 'Referral rewards and their status.', icon: Gift, element: <ReferralsPage /> },
      { path: 'notifications', title: 'Notifications', description: 'Alerts sent to you.', icon: Bell, element: <NotificationsPage /> },
      { path: 'reports', title: 'Reports', description: 'Analytics, revenue summaries and CSV exports.', icon: BarChart3, element: <ReportsPage /> },
    ],
  },
  {
    label: 'Account',
    sections: [
      { path: 'subscription', title: 'Subscription and billing', description: 'Your Vajra Fitness plan, usage limits and invoices.', icon: Sparkles, element: <SubscriptionPage /> },
      { path: 'settings', title: 'Gym profile', description: 'Gym details shown in the public directory, and your branches.', icon: Settings, element: <SettingsPage /> },
    ],
  },
];

const sections = groups.flatMap((g) => g.sections);

export default function GymAdminArea() {
  const { data: gym, isLoading } = useQuery<GymInfo>({
    queryKey: ['my-branch'],
    queryFn: () => api.get('/gym/my-branch').then((r) => r.data),
    refetchInterval: 60000,
  });

  if (gym) return <GymShell gym={gym} />;
  return (
    <AppShell nav={[]} title="Gym admin">
      {isLoading ? (
        <PageLoader />
      ) : (
        <EmptyState icon={Building2} title="No gym found" description="This account is not linked to a gym yet. Contact support if you think this is a mistake." />
      )}
    </AppShell>
  );
}

function GymShell({ gym }: { gym: GymInfo }) {
  const [confirmAction, setConfirmAction] = useState<ConfirmRequest | null>(null);
  const [branchFilter, setBranchFilter] = useState('');
  const gymId = gym.id;

  const { data: branches = [], isLoading: branchesLoading } = useQuery<GymBranch[]>({
    queryKey: ['branches', gymId],
    queryFn: () => getBranches(gymId),
    refetchInterval: 60000,
  });
  const { data: stats } = useQuery<GymStats>({
    queryKey: ['gym-stats', gymId],
    queryFn: () => api.get(`/gym/${gymId}/stats`).then((r) => r.data),
    refetchInterval: 30000,
  });
  const { data: applications = [] } = useQuery({
    queryKey: ['trainer-applications', gymId, 'PENDING'],
    queryFn: () => getTrainerApplications(gymId, 'PENDING'),
    refetchInterval: 30000,
  });

  const approvedBranches = branches.filter((b) => b.status === 'APPROVED' && b.isActive);

  const badges: Record<string, number> = { members: stats?.pendingMembers ?? 0, trainers: applications.length };
  const nav: NavGroup[] = groups.map((g) => ({
    label: g.label,
    items: g.sections.map((s) => ({
      to: `/admin/gym${s.path ? `/${s.path}` : ''}`,
      label: s.title,
      icon: s.icon,
      end: s.path === '',
      badge: badges[s.path],
    })),
  }));
  const mobileTabs = ['', 'members', 'fees', 'attendance', 'trainers']
    .map((path) => nav.flatMap((g) => g.items).find((i) => i.to === `/admin/gym${path ? `/${path}` : ''}`))
    .filter((i) => i !== undefined);

  return (
    <GymContext.Provider
      value={{ gym, branches, branchesLoading, approvedBranches, branchFilter, setBranchFilter, confirm: setConfirmAction }}
    >
      <AppShell nav={nav} mobileTabs={mobileTabs} title={gym.name}>
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {sections.map((s) => (
                <Route
                  key={s.path}
                  index={s.path === ''}
                  path={s.path || undefined}
                  element={
                    <>
                      <PageHeader title={s.title} description={s.description} />
                      {s.element}
                    </>
                  }
                />
              ))}
              <Route path="*" element={<Navigate to="/admin/gym" replace />} />
            </Routes>
          </Suspense>
        </div>
      </AppShell>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmLabel={confirmAction?.confirmLabel || 'Delete'}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={() => setConfirmAction(null)}
      />
    </GymContext.Provider>
  );
}

