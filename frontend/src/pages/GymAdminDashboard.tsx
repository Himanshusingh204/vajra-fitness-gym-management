import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, CreditCard, Dumbbell, ClipboardList, Settings, BarChart3, Diamond, Plus, Pencil, Trash2, CheckCircle, XCircle, ClipboardCheck, Shield, Download, FileDown, Calendar, Bell } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import api, { downloadFile } from '../services/api';
import { getGymBookings, updateBookingStatus, getGymMemberships, createMembership, renewMembership } from '../api/booking.api';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notification.api';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'plans', label: 'Membership Plans', icon: Diamond },
  { id: 'memberships', label: 'Memberships', icon: ClipboardCheck },
  { id: 'fees', label: 'Fees', icon: CreditCard },
  { id: 'bookings', label: 'PT Bookings', icon: Calendar },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'attendance', label: 'Attendance', icon: ClipboardList },
  { id: 'staff', label: 'Staff & Trainers', icon: Shield },
  { id: 'enquiries', label: 'Enquiries', icon: ClipboardList },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'branch', label: 'Branch', icon: Settings },
];

type Plan = { id: string; name: string; description: string | null; duration: number; price: number; isActive: boolean };
type Member = { id: string; status: string; joiningDate: string; user: { id: string; username: string; email: string; phone: string | null }; membershipPlan: Plan | null };
type WorkoutSlip = { id: string; title: string | null; exercises: string; assignedDate: string; validUntil: string | null; member: { id: string; user: { username: string; email: string } }; trainer: { id: string; user: { username: string } } | null };
type StaffEntry = { id: string; role: string; specialization: string | null; joiningDate: string; user: { id: string; username: string; email: string; phone: string | null } };
type AttendanceRecord = { id: string; checkIn: string; status: string; member: { user: { username: string } } | null; staff: { user: { username: string } } | null };
type GymStats = { totalMembers: number; activeMembers: number; pendingMembers: number; trainers: number; staff: number; totalRevenue: number; revenueThisMonth: number; pendingFees: number; attendanceToday: number; plans: number; notices: number };

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PAID: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
};

const GymAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: branch, isLoading: branchLoading } = useQuery({
    queryKey: ['my-branch'],
    queryFn: () => api.get('/gym/my-branch').then((r) => r.data),
  });

  const { data: stats, isLoading: statsLoading } = useQuery<GymStats>({
    queryKey: ['gym-stats', branch?.id],
    queryFn: () => api.get(`/gym/${branch?.id}/stats`).then((r) => r.data),
    enabled: !!branch?.id,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ['members', branch?.id],
    queryFn: () => api.get(`/members/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['plans', branch?.id],
    queryFn: () => api.get(`/plans/admin/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
  });

  const { data: fees = [], isLoading: feesLoading } = useQuery({
    queryKey: ['fees', branch?.id],
    queryFn: () => api.get(`/fees/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
  });

  const { data: workouts = [], isLoading: workoutsLoading } = useQuery<WorkoutSlip[]>({
    queryKey: ['workouts', branch?.id],
    queryFn: () => api.get(`/workouts/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
  });

  const { data: staffData, isLoading: staffLoading } = useQuery<{ trainers: StaffEntry[]; staff: StaffEntry[] }>({
    queryKey: ['staff', branch?.id],
    queryFn: () => api.get(`/staff/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
  });

  const { data: attendance = [], isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', branch?.id],
    queryFn: () => api.get(`/attendance/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
  });

  const { data: enquiries = [], isLoading: enquiriesLoading } = useQuery({
    queryKey: ['enquiries', branch?.id],
    queryFn: () => api.get(`/enquiries/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['gymBookings', branch?.id],
    queryFn: () => getGymBookings(branch?.id),
    enabled: !!branch?.id && activeTab === 'bookings',
  });

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['gymMemberships', branch?.id],
    queryFn: () => getGymMemberships(branch?.id),
    enabled: !!branch?.id && activeTab === 'memberships',
  });

  const { data: notifs, isLoading: notifsLoading } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: () => getMyNotifications({ limit: 50 }),
    enabled: activeTab === 'notifications',
  });

  const updateBookingStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateBookingStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gymBookings', branch?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminNotifications'] }),
  });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminNotifications'] }),
  });

  const [memberSearch, setMemberSearch] = useState('');

  // ---------- Memberships ----------
  const [membershipForm, setMembershipForm] = useState({ memberId: '', planId: '', startDate: '', discount: 0, paymentStatus: 'PENDING', paymentMethod: '', transactionId: '', notes: '' });
  const createMembershipMut = useMutation({
    mutationFn: (data: typeof membershipForm) => createMembership(branch?.id, { ...data, discount: Number(data.discount), startDate: data.startDate || undefined, paymentMethod: data.paymentMethod || undefined, transactionId: data.transactionId || undefined, notes: data.notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      setMembershipForm({ memberId: '', planId: '', startDate: '', discount: 0, paymentStatus: 'PENDING', paymentMethod: '', transactionId: '', notes: '' });
    },
  });
  const renewMembershipMut = useMutation({
    mutationFn: ({ membershipId, planId, discount, paymentStatus }: { membershipId: string; planId?: string; discount: number; paymentStatus: string }) =>
      renewMembership(branch?.id, { membershipId, planId: planId || undefined, discount: Number(discount), paymentStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] }),
  });
  const [renewTarget, setRenewTarget] = useState<any>(null);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewDiscount, setRenewDiscount] = useState(0);

  const [branchForm, setBranchForm] = useState({ name: '', address: '', city: '', state: '', gstNumber: '', imageUrl: '', facilities: '' });
  const branchUpdate = useMutation({
    mutationFn: (data: typeof branchForm) => api.put('/gym/my-branch', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-branch'] }),
  });

  React.useEffect(() => {
    if (branch) {
      setBranchForm({
        name: branch.name || '',
        address: branch.address || '',
        city: branch.city || '',
        state: branch.state || '',
        gstNumber: branch.gstNumber || '',
        imageUrl: branch.imageUrl || '',
        facilities: branch.facilities || '',
      });
    }
  }, [branch]);

  // ---------- Membership plans ----------
  const [planForm, setPlanForm] = useState({ name: '', description: '', duration: 30, price: 999 });
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const createPlan = useMutation({
    mutationFn: (data: typeof planForm) => api.post('/plans', { ...data, gymId: branch?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans', branch?.id] }); setPlanForm({ name: '', description: '', duration: 30, price: 999 }); },
  });
  const updatePlan = useMutation({
    mutationFn: (data: Plan) => api.put(`/plans/${data.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans', branch?.id] }); setEditingPlan(null); },
  });
  const deletePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans', branch?.id] }),
  });

  // ---------- Member management ----------
  const updateMemberStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/members/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', branch?.id, 'gym-stats'] }),
  });
  const [addMemberForm, setAddMemberForm] = useState({ username: '', email: '', phone: '', planId: '', status: 'PENDING' });
  const addMember = useMutation({
    mutationFn: (data: typeof addMemberForm) => api.post(`/members/gym/${branch?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', branch?.id, 'gym-stats'] }); setAddMemberForm({ username: '', email: '', phone: '', planId: '', status: 'PENDING' }); },
  });

  const pendingMembers = members.filter((m) => m.status === 'PENDING').length;
  const filteredMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (m.user?.username || '').toLowerCase().includes(q) || (m.user?.email || '').toLowerCase().includes(q);
  });

  // ---------- Fees ----------
  const [feeForm, setFeeForm] = useState({ memberId: '', amount: 999, dueDate: '', status: 'PENDING' });
  const recordFee = useMutation({
    mutationFn: (data: typeof feeForm) => api.post(`/fees/gym/${branch?.id}`, { ...data, amount: Number(data.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees', branch?.id, 'gym-stats'] }); setFeeForm({ memberId: '', amount: 999, dueDate: '', status: 'PENDING' }); },
  });
  const updateFeeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/fees/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fees', branch?.id, 'gym-stats'] }),
  });

  // ---------- Workouts ----------
  const [slipForm, setSlipForm] = useState({ memberId: '', title: '', exercises: '', validUntil: '', trainerId: '' });
  const createSlip = useMutation({
    mutationFn: (data: typeof slipForm) => api.post(`/workouts/member/${data.memberId}`, {
      title: data.title,
      exercises: data.exercises,
      validUntil: data.validUntil || null,
      trainerId: data.trainerId || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workouts', branch?.id] }); setSlipForm({ memberId: '', title: '', exercises: '', validUntil: '', trainerId: '' }); },
  });

  // ---------- Attendance ----------
  const [checkInForm, setCheckInForm] = useState({ memberId: '', staffId: '' });
  const markAttendance = useMutation({
    mutationFn: (data: typeof checkInForm) => api.post(`/attendance/gym/${branch?.id}`, {
      memberId: data.memberId || null,
      staffId: data.staffId || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance', branch?.id, 'gym-stats'] }); setCheckInForm({ memberId: '', staffId: '' }); },
  });

  // ---------- Staff ----------
  const [staffForm, setStaffForm] = useState({ username: '', email: '', phone: '', roleType: 'STAFF', roleSpecifics: '' });
  const addStaff = useMutation({
    mutationFn: (data: typeof staffForm) => api.post(`/staff/gym/${branch?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff', branch?.id, 'gym-stats'] }); setStaffForm({ username: '', email: '', phone: '', roleType: 'STAFF', roleSpecifics: '' }); },
  });
  const deleteStaff = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff', branch?.id, 'gym-stats'] }),
  });

  // ---------- Enquiries ----------
  const updateEnquiry = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/enquiries/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries', branch?.id] }),
  });

  // ---------- Reports ----------
  const downloadCsv = (filename: string, rows: (string | number)[][]) => {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFees = () => {
    downloadCsv(`fees-${branch?.name || 'gym'}.csv`, [
      ['Member', 'Email', 'Amount', 'Payment Date', 'Due Date', 'Status'],
      ...fees.map((f: any) => [f.member?.user?.username || '', f.member?.user?.email || '', f.amount, new Date(f.paymentDate).toLocaleDateString('en-IN'), new Date(f.dueDate).toLocaleDateString('en-IN'), f.status]),
    ]);
  };

  const exportMembers = () => {
    downloadCsv(`members-${branch?.name || 'gym'}.csv`, [
      ['Name', 'Email', 'Phone', 'Plan', 'Joined', 'Status'],
      ...members.map((m) => [m.user?.username || '', m.user?.email || '', m.user?.phone || '', m.membershipPlan?.name || '—', new Date(m.joiningDate).toLocaleDateString('en-IN'), m.status]),
    ]);
  };

  const monthly: Record<string, { collected: number; outstanding: number; count: number }> = {};
  fees.forEach((f: any) => {
    const key = new Date(f.paymentDate).toISOString().slice(0, 7);
    if (!monthly[key]) monthly[key] = { collected: 0, outstanding: 0, count: 0 };
    monthly[key].count += 1;
    if (f.status === 'PAID') monthly[key].collected += f.amount;
    else monthly[key].outstanding += f.amount;
  });
  const monthlyRows = Object.entries(monthly).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const monthLabel = (key: string) => {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  const renderStaffTable = (list: StaffEntry[], type: 'trainers' | 'staff') => (
    <div>
      <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-3 capitalize">{type}</h3>
      {list.length === 0 ? (
        <p className="text-sm text-gray-400 py-3">No {type} yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {list.map((s) => (
            <div key={s.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--color-deepgray)] dark:text-white">{s.user.username}</p>
                <p className="text-xs text-gray-500">{s.user.email} · {type === 'trainers' ? (s.specialization || 'Trainer') : s.role}</p>
              </div>
              <button
                onClick={() => { if (window.confirm(`Remove ${s.user.username}?`)) deleteStaff.mutate(s.id); }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[#0d0d0d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[var(--color-deepgray)] dark:text-white">
            {branchLoading ? 'Loading…' : branch?.name || 'Gym Dashboard'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{user?.email}</p>
        </div>

        <div className="flex gap-1 mb-8 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 p-1 rounded-xl overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'members' && pendingMembers > 0 && (
                <span className="bg-amber-400 text-amber-950 text-[10px] font-extrabold px-1.5 rounded-full">{pendingMembers}</span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {statsLoading ? (
                [...Array(8)].map((_, i) => <div key={i} className="h-28 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />)
              ) : (
                <>
                  {[
                    { label: 'Total Members', value: stats?.totalMembers ?? 0, color: 'text-[var(--color-primary)]' },
                    { label: 'Active Members', value: stats?.activeMembers ?? 0, color: 'text-green-600' },
                    { label: 'Pending Requests', value: stats?.pendingMembers ?? 0, color: 'text-amber-500' },
                    { label: 'Revenue This Month', value: `₹${(stats?.revenueThisMonth ?? 0).toLocaleString('en-IN')}`, color: 'text-green-600' },
                    { label: 'Total Revenue', value: `₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`, color: 'text-emerald-600' },
                    { label: 'Check-ins Today', value: stats?.attendanceToday ?? 0, color: 'text-blue-500' },
                    { label: 'Pending Fees', value: stats?.pendingFees ?? 0, color: 'text-red-500' },
                    { label: 'Open Enquiries', value: enquiries.filter((e: any) => e.status === 'PENDING').length, color: 'text-purple-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-gray-100 dark:border-white/10">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{label}</p>
                      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
              <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-3">At a glance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Trainers</p><p className="font-bold dark:text-white">{stats?.trainers ?? 0}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Staff</p><p className="font-bold dark:text-white">{stats?.staff ?? 0}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Membership Plans</p><p className="font-bold dark:text-white">{stats?.plans ?? 0}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Notices</p><p className="font-bold dark:text-white">{stats?.notices ?? 0}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* Members */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h2 className="font-bold text-lg dark:text-white">Members ({members.length})</h2>
                <div className="flex items-center gap-3">
                  <input
                    className="input-field sm:w-64 py-2! text-sm"
                    placeholder="Search by name or email..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  <span className="text-xs font-semibold text-amber-500">{pendingMembers} pending approval</span>
                </div>
              </div>
              {membersLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Name', 'Email', 'Plan', 'Joined', 'Status', 'Action'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {filteredMembers.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">{memberSearch ? 'No members match your search.' : 'No members yet.'}</td></tr>
                      ) : filteredMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-4 font-semibold dark:text-white">{m.user?.username}</td>
                          <td className="px-6 py-4 text-gray-500">{m.user?.email}</td>
                          <td className="px-6 py-4 text-gray-500">{m.membershipPlan?.name || '—'}</td>
                          <td className="px-6 py-4 text-gray-500">{new Date(m.joiningDate).toLocaleDateString('en-IN')}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              m.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                              m.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{m.status}</span>
                          </td>
                          <td className="px-6 py-4">
                            {m.status === 'PENDING' ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateMemberStatus.mutate({ id: m.id, status: 'ACTIVE' })}
                                  className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-semibold text-sm hover:underline"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => updateMemberStatus.mutate({ id: m.id, status: 'INACTIVE' })}
                                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-sm hover:underline"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => updateMemberStatus.mutate({ id: m.id, status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                                className="text-sm font-semibold text-gray-500 hover:text-[var(--color-primary)] hover:underline"
                              >
                                {m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6 max-w-3xl">
              <h3 className="font-bold text-lg dark:text-white mb-4">Add Member Manually</h3>
              <form
                className="grid sm:grid-cols-2 gap-4"
                onSubmit={(e) => { e.preventDefault(); addMember.mutate(addMemberForm); }}
              >
                <input className="input-field" placeholder="Full Name" value={addMemberForm.username} onChange={(e) => setAddMemberForm({ ...addMemberForm, username: e.target.value })} required />
                <input className="input-field" type="email" placeholder="Email" value={addMemberForm.email} onChange={(e) => setAddMemberForm({ ...addMemberForm, email: e.target.value })} required />
                <input className="input-field" placeholder="Phone" value={addMemberForm.phone} onChange={(e) => setAddMemberForm({ ...addMemberForm, phone: e.target.value })} />
                <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={addMemberForm.planId} onChange={(e) => setAddMemberForm({ ...addMemberForm, planId: e.target.value })}>
                  <option value="">No plan</option>
                  {plans.filter((p) => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — ₹{p.price.toLocaleString('en-IN')}</option>
                  ))}
                </select>
                <button type="submit" className="btn-primary justify-center sm:col-span-2" disabled={addMember.isPending || !branch?.id}>
                  <Plus className="w-4 h-4" /> Add Member
                </button>
                {addMember.isSuccess && (
                  <div className="sm:col-span-2 text-sm space-y-1.5">
                    <p className="text-green-600">Member added. Share the activation link to let them set their password:</p>
                    {addMember.data?.data?.activationLink && (
                      <p className="text-[var(--color-primary)] font-mono text-xs break-all bg-[var(--color-base)] border border-[var(--color-border)] p-2.5 rounded-lg">
                        {addMember.data.data.activationLink}
                      </p>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Membership Plans */}
        {activeTab === 'plans' && (
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
              <h3 className="font-bold text-lg dark:text-white mb-4">{editingPlan ? 'Edit Plan' : 'Create Membership Plan'}</h3>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingPlan) {
                    updatePlan.mutate({ ...editingPlan, name: planForm.name, description: planForm.description, duration: planForm.duration, price: planForm.price });
                  } else {
                    createPlan.mutate(planForm);
                  }
                }}
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Plan Name</label>
                  <input className="input-field" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Monthly, Quarterly" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                  <input className="input-field" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="What's included" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Duration (days)</label>
                    <input className="input-field" type="number" min={1} value={planForm.duration} onChange={(e) => setPlanForm({ ...planForm, duration: Number(e.target.value) })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Price (₹)</label>
                    <input className="input-field" type="number" min={0} value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1 justify-center" disabled={createPlan.isPending || updatePlan.isPending || !branch?.id}>
                    {editingPlan ? 'Save Changes' : 'Create Plan'}
                  </button>
                  {editingPlan && (
                    <button type="button" className="btn-outline px-5" onClick={() => { setEditingPlan(null); setPlanForm({ name: '', description: '', duration: 30, price: 999 }); }}>Cancel</button>
                  )}
                </div>
                <p className="text-xs text-gray-400">Plans you publish here appear on the public Membership page for users to join.</p>
              </form>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                <h2 className="font-bold text-lg dark:text-white">Current Plans ({plans.length})</h2>
              </div>
              {plansLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : plans.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No plans yet. Create your first one.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {plans.map((p) => (
                    <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[var(--color-deepgray)] dark:text-white">{p.name}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isActive ? 'Active' : 'Hidden'}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">₹{p.price.toLocaleString('en-IN')} · {p.duration} days{p.description ? ` · ${p.description}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updatePlan.mutate({ ...p, isActive: !p.isActive })}
                          className="text-xs font-semibold text-gray-500 hover:text-[var(--color-primary)] px-2 py-1 rounded-lg hover:bg-[var(--color-primary)]/10"
                        >
                          {p.isActive ? 'Hide' : 'Show'}
                        </button>
                        <button
                          onClick={() => { setEditingPlan(p); setPlanForm({ name: p.name, description: p.description || '', duration: p.duration, price: p.price }); }}
                          className="p-2 rounded-lg text-gray-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePlan.mutate(p.id)} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Memberships */}
        {activeTab === 'memberships' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6 items-start">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                <h3 className="font-bold text-lg dark:text-white mb-4">Create Membership</h3>
                <form
                  className="space-y-4"
                  onSubmit={(e) => { e.preventDefault(); if (membershipForm.memberId) createMembershipMut.mutate(membershipForm); }}
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Member</label>
                    <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={membershipForm.memberId} onChange={(e) => setMembershipForm({ ...membershipForm, memberId: e.target.value })} required>
                      <option value="">Select member…</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.user?.username} ({m.user?.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Plan</label>
                      <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={membershipForm.planId} onChange={(e) => setMembershipForm({ ...membershipForm, planId: e.target.value })}>
                        <option value="">Select plan…</option>
                        {plans.filter((p) => p.isActive).map((p) => (
                          <option key={p.id} value={p.id}>{p.name} — ₹{p.price.toLocaleString('en-IN')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Start Date</label>
                      <input className="input-field" type="date" value={membershipForm.startDate} onChange={(e) => setMembershipForm({ ...membershipForm, startDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Discount (₹)</label>
                      <input className="input-field" type="number" min={0} value={membershipForm.discount} onChange={(e) => setMembershipForm({ ...membershipForm, discount: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Payment Status</label>
                      <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={membershipForm.paymentStatus} onChange={(e) => setMembershipForm({ ...membershipForm, paymentStatus: e.target.value })}>
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="PARTIAL">Partial</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
                      <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={membershipForm.paymentMethod} onChange={(e) => setMembershipForm({ ...membershipForm, paymentMethod: e.target.value })}>
                        <option value="">— None —</option>
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Transaction ID</label>
                      <input className="input-field" value={membershipForm.transactionId} onChange={(e) => setMembershipForm({ ...membershipForm, transactionId: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                    <input className="input-field" value={membershipForm.notes} onChange={(e) => setMembershipForm({ ...membershipForm, notes: e.target.value })} />
                  </div>
                  <button type="submit" className="btn-primary justify-center" disabled={createMembershipMut.isPending || !branch?.id}>
                    <Plus className="w-4 h-4" /> Create Membership
                  </button>
                  {createMembershipMut.isSuccess && <p className="text-green-600 text-sm">Membership created and member activated.</p>}
                  {createMembershipMut.isError && <p className="text-red-600 text-sm">{(createMembershipMut.error as any)?.response?.data?.error || 'Failed to create membership.'}</p>}
                </form>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                  <h2 className="font-bold text-lg dark:text-white">Memberships ({memberships.length})</h2>
                </div>
                {membershipsLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : memberships.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No memberships yet.</div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[600px] overflow-y-auto">
                    {memberships.map((m: any) => (
                      <div key={m.id} className="px-6 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold dark:text-white">{m.member?.user?.username || '—'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {m.plan?.name || 'Custom'} · {new Date(m.startDate).toLocaleDateString('en-IN')} → {new Date(m.endDate).toLocaleDateString('en-IN')}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">₹{m.finalAmount.toLocaleString('en-IN')} · {m.paymentStatus}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                              m.lifecycleStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                              m.lifecycleStatus === 'EXPIRING_SOON' ? 'bg-orange-100 text-orange-700' :
                              m.lifecycleStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                              m.lifecycleStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{m.lifecycleStatus}</span>
                            {m.isRenewal && <div><span className="text-[10px] font-bold text-blue-500">RENEWAL</span></div>}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => { setRenewTarget(m); setRenewPlanId(m.planId || ''); setRenewDiscount(0); }}
                            className="text-xs font-bold text-[var(--color-primary)] hover:underline"
                          >
                            Renew
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {renewTarget && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRenewTarget(null)}>
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <h3 className="font-bold text-lg dark:text-white mb-1">Renew Membership</h3>
                  <p className="text-sm text-gray-500 mb-4">{renewTarget.member?.user?.username} — {renewTarget.plan?.name || 'Custom'}</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Plan</label>
                      <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={renewPlanId} onChange={(e) => setRenewPlanId(e.target.value)}>
                        <option value="">Keep current plan</option>
                        {plans.filter((p) => p.isActive).map((p) => (
                          <option key={p.id} value={p.id}>{p.name} — ₹{p.price.toLocaleString('en-IN')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Discount (₹)</label>
                      <input className="input-field" type="number" min={0} value={renewDiscount} onChange={(e) => setRenewDiscount(Number(e.target.value))} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary flex-1 justify-center"
                        disabled={renewMembershipMut.isPending}
                        onClick={() => {
                          renewMembershipMut.mutate({ membershipId: renewTarget.id, planId: renewPlanId, discount: renewDiscount, paymentStatus: 'PENDING' });
                          setRenewTarget(null);
                        }}
                      >
                        Confirm Renewal
                      </button>
                      <button className="btn-outline px-5" onClick={() => setRenewTarget(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PT Bookings */}
        {activeTab === 'bookings' && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <h2 className="font-bold text-lg dark:text-white">PT Bookings ({bookings.length})</h2>
            </div>
            {bookingsLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : bookings.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No bookings yet.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {bookings.map((b: any) => (
                  <div key={b.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold dark:text-white">{b.user?.username}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {b.date} · {b.time} · Trainer: {b.trainer?.username}
                      </p>
                      {b.notes && <p className="text-xs text-gray-400 mt-0.5">Notes: {b.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        b.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                        b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>{b.status}</span>
                      {b.status === 'PENDING' && (
                        <>
                          <button onClick={() => updateBookingStatusMut.mutate({ id: b.id, status: 'CONFIRMED' })} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Confirm
                          </button>
                          <button onClick={() => updateBookingStatusMut.mutate({ id: b.id, status: 'CANCELLED' })} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <button onClick={() => updateBookingStatusMut.mutate({ id: b.id, status: 'COMPLETED' })} className="bg-green-500 hover:bg-green-600 text-white rounded font-bold text-xs px-3 py-1.5 transition-colors">
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
              <h2 className="font-bold text-lg dark:text-white">Notifications ({notifs?.unreadCount ?? 0} unread)</h2>
              <button onClick={() => markAllRead.mutate()} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
                Mark all read
              </button>
            </div>
            {notifsLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {(notifs?.notifications || []).map((n: any) => (
                  <button key={n.id} onClick={() => markRead.mutate(n.id)} className={`w-full text-left px-6 py-4 flex items-start justify-between gap-3 ${n.isRead ? '' : 'bg-[var(--color-primary)]/5'}`}>
                    <div>
                      <p className="font-bold dark:text-white flex items-center gap-2">
                        {n.title}
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                  </button>
                ))}
                {(!notifs?.notifications || notifs.notifications.length === 0) && (
                  <div className="p-8 text-center text-gray-400">No notifications yet.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fees */}
        {activeTab === 'fees' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6 items-start">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                <h3 className="font-bold text-lg dark:text-white mb-4">Record a Fee</h3>
                <form
                  className="grid sm:grid-cols-2 gap-4"
                  onSubmit={(e) => { e.preventDefault(); if (feeForm.memberId) recordFee.mutate(feeForm); }}
                >
                  <select className="input-field sm:col-span-2 bg-white! dark:bg-[#1a1a1a]!" value={feeForm.memberId} onChange={(e) => setFeeForm({ ...feeForm, memberId: e.target.value })} required>
                    <option value="">Select member…</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.user?.username} ({m.user?.email})</option>
                    ))}
                  </select>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Amount (₹)</label>
                    <input className="input-field" type="number" min={0} value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: Number(e.target.value) })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Due Date</label>
                    <input className="input-field" type="date" value={feeForm.dueDate} onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })} required />
                  </div>
                  <select className="input-field sm:col-span-2 bg-white! dark:bg-[#1a1a1a]!" value={feeForm.status} onChange={(e) => setFeeForm({ ...feeForm, status: e.target.value })}>
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                  <button type="submit" className="btn-primary justify-center sm:col-span-2" disabled={recordFee.isPending || !branch?.id}>
                    <Plus className="w-4 h-4" /> Record Fee
                  </button>
                </form>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                  <h2 className="font-bold text-lg dark:text-white">Fee Records ({fees.length})</h2>
                  <button onClick={exportFees} className="btn-outline text-sm px-3 py-1.5"><Download className="w-3.5 h-3.5" /> CSV</button>
                </div>
                {feesLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : fees.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No fee records yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-white/5">
                        <tr>
                          {['Member', 'Amount', 'Due Date', 'Status', 'Actions'].map((h) => (
                            <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {fees.map((f: any) => (
                          <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="px-6 py-4 font-semibold dark:text-white">{f.member?.user?.username || '—'}</td>
                            <td className="px-6 py-4 font-semibold text-[var(--color-primary)]">₹{f.amount.toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 text-gray-500">{new Date(f.dueDate).toLocaleDateString('en-IN')}</td>
                            <td className="px-6 py-4">{statusBadge(f.status)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {f.status !== 'PAID' && (
                                  <button
                                    onClick={() => updateFeeStatus.mutate({ id: f.id, status: 'PAID' })}
                                    className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-semibold text-xs hover:underline"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                                  </button>
                                )}
                                <button
                                  onClick={() => downloadFile(`/fees/${f.id}/receipt`, `receipt-${f.id.slice(0, 8)}.pdf`)}
                                  className="inline-flex items-center gap-1 text-[var(--color-primary)] font-semibold text-xs hover:underline"
                                >
                                  <Download className="w-3.5 h-3.5" /> Receipt
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workouts */}
        {activeTab === 'workouts' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6 items-start">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                <h3 className="font-bold text-lg dark:text-white mb-4">Assign a Workout Slip</h3>
                <form
                  className="space-y-4"
                  onSubmit={(e) => { e.preventDefault(); if (slipForm.memberId) createSlip.mutate(slipForm); }}
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Member</label>
                    <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={slipForm.memberId} onChange={(e) => setSlipForm({ ...slipForm, memberId: e.target.value })} required>
                      <option value="">Select member…</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.user?.username} ({m.user?.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
                      <input className="input-field" value={slipForm.title} onChange={(e) => setSlipForm({ ...slipForm, title: e.target.value })} placeholder="e.g. Push Day" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Valid Until</label>
                      <input className="input-field" type="date" value={slipForm.validUntil} onChange={(e) => setSlipForm({ ...slipForm, validUntil: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Trainer (optional)</label>
                    <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={slipForm.trainerId} onChange={(e) => setSlipForm({ ...slipForm, trainerId: e.target.value })}>
                      <option value="">No trainer</option>
                      {(staffData?.trainers || []).map((t) => (
                        <option key={t.id} value={t.id}>{t.user.username}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Exercises</label>
                    <textarea
                      className="input-field"
                      rows={4}
                      value={slipForm.exercises}
                      onChange={(e) => setSlipForm({ ...slipForm, exercises: e.target.value })}
                      placeholder={'One exercise per line or comma-separated\ne.g.\nBench Press 3x10\nSquats 3x12'}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary justify-center" disabled={createSlip.isPending || !branch?.id}>
                    <Plus className="w-4 h-4" /> Assign Slip
                  </button>
                </form>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                  <h2 className="font-bold text-lg dark:text-white">Workout Slips ({workouts.length})</h2>
                </div>
                {workoutsLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : workouts.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No workout slips assigned yet.</div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[560px] overflow-y-auto">
                    {workouts.map((slip) => (
                      <div key={slip.id} className="px-6 py-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-[var(--color-deepgray)] dark:text-white">{slip.title || 'Workout Plan'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {slip.member?.user?.username} · by {slip.trainer?.user?.username || 'Gym Admin'} · {new Date(slip.assignedDate).toLocaleDateString('en-IN')}
                            {slip.validUntil ? ` · valid till ${new Date(slip.validUntil).toLocaleDateString('en-IN')}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2 max-w-[340px]">{slip.exercises}</p>
                        </div>
                        <button
                          onClick={() => downloadFile(`/workouts/${slip.id}/pdf`, `workout-${slip.id.slice(0, 8)}.pdf`)}
                          className="inline-flex items-center gap-1.5 text-[var(--color-primary)] font-semibold text-sm hover:underline shrink-0"
                        >
                          <Download className="w-4 h-4" /> PDF
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Attendance */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6 items-start">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                <h3 className="font-bold text-lg dark:text-white mb-4">Check-in</h3>
                <form
                  className="space-y-4"
                  onSubmit={(e) => { e.preventDefault(); if (checkInForm.memberId || checkInForm.staffId) markAttendance.mutate(checkInForm); }}
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Member</label>
                    <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={checkInForm.memberId} onChange={(e) => setCheckInForm({ ...checkInForm, memberId: e.target.value })}>
                      <option value="">— No member —</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.user?.username} ({m.user?.email})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Staff (optional)</label>
                    <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={checkInForm.staffId} onChange={(e) => setCheckInForm({ ...checkInForm, staffId: e.target.value })}>
                      <option value="">— No staff —</option>
                      {(staffData?.staff || []).map((s) => (
                        <option key={s.id} value={s.id}>{s.user.username} ({s.role})</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary justify-center" disabled={markAttendance.isPending || !branch?.id}>
                    <ClipboardCheck className="w-4 h-4" /> Mark Present
                  </button>
                  {markAttendance.isSuccess && <p className="text-green-600 text-sm">Checked in successfully.</p>}
                </form>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                  <h2 className="font-bold text-lg dark:text-white">Today's Attendance ({attendance.length})</h2>
                  <span className="text-xs font-semibold text-blue-500">{stats?.attendanceToday ?? 0} check-ins</span>
                </div>
                {attendanceLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : attendance.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No check-ins yet today.</div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[420px] overflow-y-auto">
                    {attendance.map((a) => (
                      <div key={a.id} className="px-6 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[var(--color-deepgray)] dark:text-white">
                            {a.member?.user?.username || a.staff?.user?.username || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">{a.member ? 'Member' : 'Staff'} · {new Date(a.checkIn).toLocaleString('en-IN')}</p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Staff */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6 items-start">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                <h3 className="font-bold text-lg dark:text-white mb-4">Add Staff / Trainer</h3>
                <form
                  className="space-y-4"
                  onSubmit={(e) => { e.preventDefault(); addStaff.mutate(staffForm); }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
                      <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={staffForm.roleType} onChange={(e) => setStaffForm({ ...staffForm, roleType: e.target.value })}>
                        <option value="STAFF">Staff</option>
                        <option value="TRAINER">Trainer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{staffForm.roleType === 'TRAINER' ? 'Specialization' : 'Position'}</label>
                      <input className="input-field" value={staffForm.roleSpecifics} onChange={(e) => setStaffForm({ ...staffForm, roleSpecifics: e.target.value })} placeholder={staffForm.roleType === 'TRAINER' ? 'e.g. Strength & Conditioning' : 'e.g. Receptionist'} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                    <input className="input-field" value={staffForm.username} onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                      <input className="input-field" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
                      <input className="input-field" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary justify-center" disabled={addStaff.isPending || !branch?.id}>
                    <Plus className="w-4 h-4" /> Add {staffForm.roleType === 'TRAINER' ? 'Trainer' : 'Staff'}
                  </button>
                  {addStaff.isSuccess && (
                    <div className="text-sm space-y-1.5">
                      <p className="text-green-600">Added. Share the activation link to let them set their password:</p>
                      {addStaff.data?.data?.activationLink && (
                        <p className="text-[var(--color-primary)] font-mono text-xs break-all bg-[var(--color-base)] border border-[var(--color-border)] p-2.5 rounded-lg">
                          {addStaff.data.data.activationLink}
                        </p>
                      )}
                    </div>
                  )}
                </form>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                <h2 className="font-bold text-lg dark:text-white mb-4">Team ({staffData?.trainers.length || 0} trainers · {staffData?.staff.length || 0} staff)</h2>
                {staffLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : (
                  <div className="space-y-6">
                    {renderStaffTable(staffData?.trainers || [], 'trainers')}
                    <div className="border-t border-gray-100 dark:border-white/5" />
                    {renderStaffTable(staffData?.staff || [], 'staff')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enquiries */}
        {activeTab === 'enquiries' && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <h2 className="font-bold text-lg dark:text-white">Enquiries / Leads</h2>
            </div>
            {enquiriesLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      {['Name', 'Phone', 'Email', 'Date', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {enquiries.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No enquiries yet.</td></tr>
                    ) : enquiries.map((e: any) => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-6 py-4 font-semibold dark:text-white">{e.name}</td>
                        <td className="px-6 py-4 text-gray-500">{e.phone}</td>
                        <td className="px-6 py-4 text-gray-500">{e.email || '—'}</td>
                        <td className="px-6 py-4 text-gray-500">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            e.status === 'CONVERTED' ? 'bg-green-100 text-green-700' :
                            e.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' :
                            'bg-blue-100 text-blue-700'
                          }`}>{e.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {e.status !== 'CONVERTED' && (
                              <button
                                onClick={() => updateEnquiry.mutate({ id: e.id, status: 'CONVERTED' })}
                                className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-semibold text-xs hover:underline"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Converted
                              </button>
                            )}
                            {e.status !== 'CLOSED' && (
                              <button
                                onClick={() => updateEnquiry.mutate({ id: e.id, status: 'CLOSED' })}
                                className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 font-semibold text-xs hover:underline"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Close
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Branch Settings */}
        {activeTab === 'branch' && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-8 max-w-2xl">
            <h2 className="font-bold text-lg dark:text-white mb-6">Branch Settings</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                branchUpdate.mutate(branchForm);
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Gym Name</label>
                <input className="input-field" value={branchForm.name} onChange={(e) => setBranchForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
                <input className="input-field" value={branchForm.address} onChange={(e) => setBranchForm((p) => ({ ...p, address: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">City</label>
                  <input className="input-field" value={branchForm.city} onChange={(e) => setBranchForm((p) => ({ ...p, city: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">State</label>
                  <input className="input-field" value={branchForm.state} onChange={(e) => setBranchForm((p) => ({ ...p, state: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">GST Number</label>
                <input className="input-field" value={branchForm.gstNumber} onChange={(e) => setBranchForm((p) => ({ ...p, gstNumber: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Cover Image URL</label>
                <input className="input-field" value={branchForm.imageUrl} onChange={(e) => setBranchForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://... (shows on the public gym directory)" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Facilities</label>
                <input className="input-field" value={branchForm.facilities} onChange={(e) => setBranchForm((p) => ({ ...p, facilities: e.target.value }))} placeholder="Cardio Zone, Free Weights, CrossFit Area" />
              </div>
              <button type="submit" disabled={branchUpdate.isPending} className="btn-primary py-3 px-8">
                {branchUpdate.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              {branchUpdate.isSuccess && (
                <p className="text-green-600 text-sm font-medium">Changes saved successfully.</p>
              )}
            </form>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-8">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <h2 className="font-bold text-lg dark:text-white">Revenue & Growth Reports</h2>
                <div className="flex gap-2">
                  <button onClick={exportMembers} className="btn-outline px-4 py-2 text-sm"><FileDown className="w-4 h-4" /> Members CSV</button>
                  <button onClick={exportFees} className="btn-outline px-4 py-2 text-sm"><FileDown className="w-4 h-4" /> Fees CSV</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Collected</p>
                  <p className="text-2xl font-extrabold text-green-600">₹{fees.filter((f: any) => f.status === 'PAID').reduce((s: number, f: any) => s + f.amount, 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Outstanding</p>
                  <p className="text-2xl font-extrabold text-amber-500">₹{fees.filter((f: any) => f.status !== 'PAID').reduce((s: number, f: any) => s + f.amount, 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Members</p>
                  <p className="text-2xl font-extrabold text-[var(--color-primary)]">{members.length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Active Plans</p>
                  <p className="text-2xl font-extrabold text-blue-500">{plans.filter((p) => p.isActive).length}</p>
                </div>
              </div>

              <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-3">Monthly Fee Summary</h3>
              {monthlyRows.length === 0 ? (
                <div className="h-32 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400">
                  No fee records to chart yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Month', 'Records', 'Collected', 'Outstanding'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {monthlyRows.map(([key, m]) => (
                        <tr key={key} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-3 font-semibold dark:text-white">{monthLabel(key)}</td>
                          <td className="px-6 py-3 text-gray-500">{m.count}</td>
                          <td className="px-6 py-3 font-semibold text-green-600">₹{m.collected.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-amber-500">₹{m.outstanding.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GymAdminDashboard;
