import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, CreditCard, Dumbbell, ClipboardList, Settings, BarChart3, Diamond, Plus, Pencil, Trash2, CheckCircle, XCircle, ClipboardCheck, Shield, Download, FileDown, Calendar, Bell, Megaphone, Receipt, Package, Wrench, Dumbbell as DumbbellIcon, Users as UsersIcon, Gift, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, PieChart } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import api, { downloadFile } from '../services/api';
import { getGymBookings, updateBookingStatus, getGymMemberships, createMembership, renewMembership } from '../api/booking.api';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notification.api';
import { getGymNotices, createNotice, updateNotice, deleteNotice } from '../api/notice.api';
import { getExpenses, recordExpense, deleteExpense, getExpenseSummary } from '../api/expense.api';
import { getProducts, createProduct, deleteProduct, getCategories, getSales } from '../api/inventory.api';
import { getEquipment, addEquipment, deleteEquipment } from '../api/equipment.api';
import { getClasses, createClass, deleteClass } from '../api/class.api';
import { getBranches, createBranch, deleteBranch, type GymBranch } from '../api/branch.api';
import { getPayslips, createPayslip, updatePayslipStatus, deletePayslip, getPayslipSummary } from '../api/payslip.api';
import { getReferrals, createReferral, updateReferralStatus, getReferralStats } from '../api/referral.api';
import { getGymAnalytics } from '../api/reports.api';
import { LineChart, BarChart, AreaChart, DonutChart, HeatmapChart } from '../components/charts';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'analytics', label: 'Analytics', icon: PieChart },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'plans', label: 'Membership Plans', icon: Diamond },
  { id: 'memberships', label: 'Memberships', icon: ClipboardCheck },
  { id: 'fees', label: 'Fees', icon: CreditCard },
  { id: 'bookings', label: 'PT Bookings', icon: Calendar },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'attendance', label: 'Attendance', icon: ClipboardList },
  { id: 'staff', label: 'Staff & Trainers', icon: Shield },
  { id: 'enquiries', label: 'Enquiries', icon: ClipboardList },
  { id: 'notices', label: 'Notices', icon: Megaphone },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
  { id: 'classes', label: 'Classes', icon: DumbbellIcon },
  { id: 'payslips', label: 'Payroll', icon: UsersIcon },
  { id: 'referrals', label: 'Referrals', icon: Gift },
  { id: 'branch', label: 'Branch', icon: Settings },
];

type Plan = { id: string; name: string; description: string | null; duration: number; price: number; isActive: boolean };
type Member = { id: string; status: string; joiningDate: string; user: { id: string; username: string; email: string; phone: string | null }; membershipPlan: Plan | null; branch?: { id: string; name: string } | null };
type WorkoutSlip = { id: string; title: string | null; exercises: string; assignedDate: string; validUntil: string | null; member: { id: string; user: { username: string; email: string } }; trainer: { id: string; user: { username: string } } | null };
type StaffEntry = { id: string; role: string; specialization: string | null; joiningDate: string; user: { id: string; username: string; email: string; phone: string | null }; branch?: { id: string; name: string } | null };
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
  const today = new Date().toISOString().slice(0, 10);

  const { data: branch, isLoading: branchLoading } = useQuery({
    queryKey: ['my-branch'],
    queryFn: () => api.get('/gym/my-branch').then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery<GymBranch[]>({
    queryKey: ['branches', branch?.id],
    queryFn: () => getBranches(branch?.id),
    enabled: !!branch?.id,
    refetchInterval: 60000,
  });
  const [branchFilter, setBranchFilter] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery<GymStats>({
    queryKey: ['gym-stats', branch?.id],
    queryFn: () => api.get(`/gym/${branch?.id}/stats`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ['members', branch?.id, branchFilter],
    queryFn: () => api.get(`/members/gym/${branch?.id}`, { params: branchFilter ? { branchId: branchFilter } : undefined }).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['plans', branch?.id],
    queryFn: () => api.get(`/plans/admin/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: fees = [], isLoading: feesLoading } = useQuery({
    queryKey: ['fees', branch?.id],
    queryFn: () => api.get(`/fees/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: workouts = [], isLoading: workoutsLoading } = useQuery<WorkoutSlip[]>({
    queryKey: ['workouts', branch?.id],
    queryFn: () => api.get(`/workouts/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: staffData, isLoading: staffLoading } = useQuery<{ trainers: StaffEntry[]; staff: StaffEntry[] }>({
    queryKey: ['staff', branch?.id, branchFilter],
    queryFn: () => api.get(`/staff/gym/${branch?.id}`, { params: branchFilter ? { branchId: branchFilter } : undefined }).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: attendance = [], isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', branch?.id, branchFilter],
    queryFn: () => api.get(`/attendance/gym/${branch?.id}`, { params: { date: today, ...(branchFilter ? { branchId: branchFilter } : {}) } }).then((r) => r.data.records),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: enquiries = [], isLoading: enquiriesLoading } = useQuery({
    queryKey: ['enquiries', branch?.id],
    queryFn: () => api.get(`/enquiries/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['gymBookings', branch?.id],
    queryFn: () => getGymBookings(branch?.id),
    enabled: !!branch?.id && activeTab === 'bookings',
    refetchInterval: 30000,
  });

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['gymMemberships', branch?.id],
    queryFn: () => getGymMemberships(branch?.id),
    enabled: !!branch?.id && activeTab === 'memberships',
    refetchInterval: 20000,
  });

  const { data: notifs, isLoading: notifsLoading } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: () => getMyNotifications({ limit: 50 }),
    enabled: activeTab === 'notifications',
    refetchInterval: 30000,
  });

  // ---------- Notices ----------
  const { data: notices = [], isLoading: noticesLoading } = useQuery({
    queryKey: ['gymNotices', branch?.id],
    queryFn: () => getGymNotices(branch?.id),
    enabled: !!branch?.id && activeTab === 'notices',
    refetchInterval: 30000,
  });

  // ---------- Analytics ----------
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['gymAnalytics', branch?.id],
    queryFn: () => getGymAnalytics(branch?.id),
    enabled: !!branch?.id && activeTab === 'analytics',
    refetchInterval: 60000,
  });

  const [noticeForm, setNoticeForm] = useState({ title: '', content: '' });
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const createNoticeMut = useMutation({
    mutationFn: (data: typeof noticeForm) => createNotice(branch?.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gymNotices', branch?.id] });
      setNoticeForm({ title: '', content: '' });
    },
  });
  const updateNoticeMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof noticeForm }) => updateNotice(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gymNotices', branch?.id] });
      setEditingNotice(null);
      setNoticeForm({ title: '', content: '' });
    },
  });
  const deleteNoticeMut = useMutation({
    mutationFn: (id: string) => deleteNotice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gymNotices', branch?.id] }),
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
    mutationFn: (data: typeof membershipForm) => createMembership(branch?.id, { ...data, planId: data.planId || undefined, discount: Number(data.discount), startDate: data.startDate || undefined, paymentMethod: data.paymentMethod || undefined, transactionId: data.transactionId || undefined, notes: data.notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      setMembershipForm({ memberId: '', planId: '', startDate: '', discount: 0, paymentStatus: 'PENDING', paymentMethod: '', transactionId: '', notes: '' });
    },
  });
  const renewMembershipMut = useMutation({
    mutationFn: ({ membershipId, planId, discount, paymentStatus }: { membershipId: string; planId?: string; discount: number; paymentStatus: string }) =>
      renewMembership(branch?.id, { membershipId, planId: planId || undefined, discount: Number(discount), paymentStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
    },
  });
  const [renewTarget, setRenewTarget] = useState<any>(null);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewDiscount, setRenewDiscount] = useState(0);

  const [branchForm, setBranchForm] = useState({ name: '', address: '', city: '', state: '', gstNumber: '', imageUrl: '', facilities: '' });
  const branchUpdate = useMutation({
    mutationFn: (data: typeof branchForm) => api.put('/gym/my-branch', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-branch'] }),
  });

  const [newBranchForm, setNewBranchForm] = useState({ name: '', address: '', city: '', state: '', phone: '' });
  const createBranchMut = useMutation({
    mutationFn: (data: typeof newBranchForm) => createBranch(branch?.id, { ...data, phone: data.phone || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches', branch?.id] });
      setNewBranchForm({ name: '', address: '', city: '', state: '', phone: '' });
    },
  });
  const disableBranchMut = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches', branch?.id] }),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans', branch?.id] }); qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] }); setPlanForm({ name: '', description: '', duration: 30, price: 999 }); },
  });
  const updatePlan = useMutation({
    mutationFn: (data: Plan) => api.put(`/plans/${data.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans', branch?.id] }); qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] }); setEditingPlan(null); },
  });
  const deletePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans', branch?.id] }); qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] }); },
  });

  // ---------- Member management ----------
  const updateMemberStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/members/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
    },
  });
  const deleteMember = useMutation({
    mutationFn: (id: string) => api.delete(`/members/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
    },
  });
  const [addMemberForm, setAddMemberForm] = useState({ username: '', email: '', phone: '', planId: '', status: 'PENDING', branchId: '' });
  const addMember = useMutation({
    mutationFn: (data: typeof addMemberForm) => api.post(`/members/gym/${branch?.id}`, {
      username: data.username,
      email: data.email,
      phone: data.phone || undefined,
      planId: data.planId || undefined,
      status: data.status,
      branchId: data.branchId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      setAddMemberForm({ username: '', email: '', phone: '', planId: '', status: 'PENDING', branchId: '' });
    },
  });

  const assignMemberBranch = useMutation({
    mutationFn: ({ id, branchId }: { id: string; branchId: string }) => api.put(`/members/${id}`, { branchId: branchId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['branches', branch?.id] });
    },
  });

  const pendingMembers = members.filter((m) => m.status === 'PENDING').length;
  const filteredMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (m.user?.username || '').toLowerCase().includes(q) || (m.user?.email || '').toLowerCase().includes(q);
  });

  // ---------- Fees ----------
  const [feeForm, setFeeForm] = useState({ memberId: '', amount: 999, dueDate: '', status: 'PENDING', notes: '' });
  const recordFee = useMutation({
    mutationFn: (data: typeof feeForm) => api.post(`/fees/gym/${branch?.id}`, { ...data, amount: Number(data.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      setFeeForm({ memberId: '', amount: 999, dueDate: '', status: 'PENDING', notes: '' });
    },
  });
  const updateFeeStatus = useMutation({
    mutationFn: ({ id, status, paymentMethod, transactionId, notes }: { id: string; status: string; paymentMethod?: string; transactionId?: string; notes?: string }) =>
      api.put(`/fees/${id}`, { status, paymentMethod, transactionId, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
    },
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
      ...(data.memberId ? { memberId: data.memberId } : {}),
      ...(data.staffId ? { staffId: data.staffId } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      setCheckInForm({ memberId: '', staffId: '' });
    },
  });

  // ---------- Staff ----------
  const [staffForm, setStaffForm] = useState({ username: '', email: '', phone: '', roleType: 'STAFF', roleSpecifics: '', branchId: '' });
  const addStaff = useMutation({
    mutationFn: (data: typeof staffForm) => api.post(`/staff/gym/${branch?.id}`, { ...data, branchId: data.branchId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      setStaffForm({ username: '', email: '', phone: '', roleType: 'STAFF', roleSpecifics: '', branchId: '' });
    },
  });
  const deleteStaff = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
    },
  });

  // ---------- Enquiries ----------
  const updateEnquiry = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/enquiries/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries', branch?.id] }),
  });

  // ---------- Expenses ----------
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', branch?.id],
    queryFn: () => getExpenses(branch?.id),
    enabled: !!branch?.id && activeTab === 'expenses',
  });
  const { data: expenseSummary } = useQuery({
    queryKey: ['expenseSummary', branch?.id],
    queryFn: () => getExpenseSummary(branch?.id),
    enabled: !!branch?.id && activeTab === 'expenses',
  });
  const [expenseForm, setExpenseForm] = useState({ category: '', description: '', amount: 0, date: '', isRecurring: false, notes: '' });
  const createExpenseMut = useMutation({
    mutationFn: (data: typeof expenseForm) => recordExpense(branch?.id, { ...data, amount: Number(data.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses', branch?.id] }); qc.invalidateQueries({ queryKey: ['expenseSummary', branch?.id] }); setExpenseForm({ category: '', description: '', amount: 0, date: '', isRecurring: false, notes: '' }); },
  });
  const deleteExpenseMut = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses', branch?.id] }); qc.invalidateQueries({ queryKey: ['expenseSummary', branch?.id] }); },
  });

  // ---------- Inventory ----------
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', branch?.id],
    queryFn: () => getProducts(branch?.id),
    enabled: !!branch?.id && activeTab === 'inventory',
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', branch?.id],
    queryFn: () => getCategories(branch?.id),
    enabled: !!branch?.id && activeTab === 'inventory',
  });
  const { data: sales = [] } = useQuery({
    queryKey: ['sales', branch?.id],
    queryFn: () => getSales(branch?.id),
    enabled: !!branch?.id && activeTab === 'inventory',
  });
  const [productForm, setProductForm] = useState({ name: '', sku: '', description: '', purchasePrice: 0, sellingPrice: 0, stock: 0, minimumStock: 0, categoryId: '' });
  const createProductMut = useMutation({
    mutationFn: (data: typeof productForm) => createProduct(branch?.id, { ...data, purchasePrice: Number(data.purchasePrice), sellingPrice: Number(data.sellingPrice), stock: Number(data.stock), minimumStock: Number(data.minimumStock) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products', branch?.id] }); setProductForm({ name: '', sku: '', description: '', purchasePrice: 0, sellingPrice: 0, stock: 0, minimumStock: 0, categoryId: '' }); },
  });
  const deleteProductMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products', branch?.id] }),
  });

  // ---------- Equipment ----------
  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment', branch?.id],
    queryFn: () => getEquipment(branch?.id),
    enabled: !!branch?.id && activeTab === 'equipment',
  });
  const [equipForm, setEquipForm] = useState({ name: '', serialNumber: '', purchaseDate: '', purchaseCost: 0, warrantyExpiry: '', location: '', condition: 'GOOD', notes: '' });
  const addEquipMut = useMutation({
    mutationFn: (data: typeof equipForm) => addEquipment(branch?.id, { ...data, purchaseCost: Number(data.purchaseCost) || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment', branch?.id] }); setEquipForm({ name: '', serialNumber: '', purchaseDate: '', purchaseCost: 0, warrantyExpiry: '', location: '', condition: 'GOOD', notes: '' }); },
  });
  const deleteEquipMut = useMutation({
    mutationFn: (id: string) => deleteEquipment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment', branch?.id] }),
  });

  // ---------- Classes ----------
  const { data: gymClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes', branch?.id, branchFilter],
    queryFn: () => getClasses(branch?.id, { ...(branchFilter ? { branchId: branchFilter } : {}) }),
    enabled: !!branch?.id && activeTab === 'classes',
  });
  const [classForm, setClassForm] = useState({ name: '', description: '', capacity: 20, duration: 60, dayOfWeek: '', startTime: '', endTime: '', location: '', trainerId: '', branchId: '' });
  const createClassMut = useMutation({
    mutationFn: (data: typeof classForm) => createClass(branch?.id, { ...data, capacity: Number(data.capacity), duration: Number(data.duration), branchId: data.branchId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes', branch?.id] }); setClassForm({ name: '', description: '', capacity: 20, duration: 60, dayOfWeek: '', startTime: '', endTime: '', location: '', trainerId: '', branchId: '' }); },
  });
  const deleteClassMut = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes', branch?.id] }),
  });

  // ---------- Payslips ----------
  const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ['payslips', branch?.id],
    queryFn: () => getPayslips(branch?.id),
    enabled: !!branch?.id && activeTab === 'payslips',
  });
  const { data: payslipSummary } = useQuery({
    queryKey: ['payslipSummary', branch?.id],
    queryFn: () => getPayslipSummary(branch?.id),
    enabled: !!branch?.id && activeTab === 'payslips',
  });
  const [payslipForm, setPayslipForm] = useState({ userId: '', month: 1, year: new Date().getFullYear(), basicSalary: 0, bonuses: 0, deductions: 0, notes: '' });
  const createPayslipMut = useMutation({
    mutationFn: (data: typeof payslipForm) => createPayslip(branch?.id, { ...data, basicSalary: Number(data.basicSalary), bonuses: Number(data.bonuses), deductions: Number(data.deductions) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payslips', branch?.id] }); qc.invalidateQueries({ queryKey: ['payslipSummary', branch?.id] }); setPayslipForm({ userId: '', month: 1, year: new Date().getFullYear(), basicSalary: 0, bonuses: 0, deductions: 0, notes: '' }); },
  });
  const updatePayslipStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updatePayslipStatus(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payslips', branch?.id] }); qc.invalidateQueries({ queryKey: ['payslipSummary', branch?.id] }); },
  });
  const deletePayslipMut = useMutation({
    mutationFn: (id: string) => deletePayslip(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payslips', branch?.id] }); qc.invalidateQueries({ queryKey: ['payslipSummary', branch?.id] }); },
  });

  // ---------- Referrals ----------
  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ['referrals', branch?.id],
    queryFn: () => getReferrals(branch?.id),
    enabled: !!branch?.id && activeTab === 'referrals',
  });
  const { data: referralStats } = useQuery({
    queryKey: ['referralStats', branch?.id],
    queryFn: () => getReferralStats(branch?.id),
    enabled: !!branch?.id && activeTab === 'referrals',
  });
  const [referralForm, setReferralForm] = useState({ userId: '', referredUserId: '', rewardType: 'CREDIT', rewardValue: 0 });
  const createReferralMut = useMutation({
    mutationFn: (data: typeof referralForm) => createReferral(branch?.id, { ...data, rewardValue: Number(data.rewardValue) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['referrals', branch?.id] }); qc.invalidateQueries({ queryKey: ['referralStats', branch?.id] }); setReferralForm({ userId: '', referredUserId: '', rewardType: 'CREDIT', rewardValue: 0 }); },
  });
  const updateReferralStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateReferralStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['referrals', branch?.id] }); qc.invalidateQueries({ queryKey: ['referralStats', branch?.id] }); },
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
                <p className="text-xs text-gray-500">{s.user.email} · {type === 'trainers' ? (s.specialization || 'Trainer') : s.role}{s.branch?.name ? ` · ${s.branch.name}` : ''}</p>
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

  const branchFilterSelect = (
    <select
      className="input-field bg-white! dark:bg-[#1a1a1a]! py-2! text-sm w-48"
      value={branchFilter}
      onChange={(e) => setBranchFilter(e.target.value)}
    >
      <option value="">All branches</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>{b.name}{b.isActive ? '' : ' (disabled)'}</option>
      ))}
    </select>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 stagger">
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

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {analyticsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />)}
              </div>
            ) : analytics ? (
              <>
                {/* Revenue Trend */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                  <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
                    Revenue Trend (Last 6 Months)
                  </h3>
                  <div className="h-72">
                    <LineChart
                      series={[
                        { name: 'Fees', data: analytics.monthlyRevenueTrend.map(d => ({ label: d.month, value: d.fees })) },
                        { name: 'Memberships', data: analytics.monthlyRevenueTrend.map(d => ({ label: d.month, value: d.memberships })) },
                        { name: 'Total', data: analytics.monthlyRevenueTrend.map(d => ({ label: d.month, value: d.total })) },
                      ]}
                      config={{ height: 280, showArea: true }}
                    />
                  </div>
                </div>

                {/* Member Growth */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                  <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    Member Growth (Last 6 Months)
                  </h3>
                  <div className="h-72">
                    <AreaChart
                      series={[
                        { name: 'Total Members', data: analytics.memberGrowth.map(d => ({ label: d.month, value: d.totalMembers })) },
                      ]}
                      config={{ height: 280, showArea: true }}
                    />
                  </div>
                </div>

                {/* Membership Plan Distribution */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                  <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    Membership Plan Distribution
                  </h3>
                  <div className="h-72 flex items-center justify-center">
                    <DonutChart
                      data={analytics.planDistribution.map(p => ({ label: p.name, value: p.members }))}
                      config={{ width: 300, height: 300 }}
                    />
                  </div>
                </div>

                {/* Attendance Trend */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                  <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Daily Attendance (Last 30 Days)
                  </h3>
                  <div className="h-72">
                    <BarChart
                      series={[
                        { name: 'Check-ins', data: analytics.attendanceTrend.map(d => ({ label: d.date, value: d.checkIns })) },
                      ]}
                      config={{ height: 280 }}
                    />
                  </div>
                </div>

                {/* Peak Hours Heatmap */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                  <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-600" />
                    Peak Hours Heatmap (Last 30 Days)
                  </h3>
                  <div className="h-96">
                    <HeatmapChart
                      data={analytics.heatmapData}
                      config={{ width: 700, height: 350 }}
                    />
                  </div>
                </div>

                {/* Payment Status & Methods */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                    <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      Payment Status (Last 30 Days)
                    </h3>
                    <div className="h-72">
                      <DonutChart
                        data={analytics.paymentStatus.map(p => ({ label: p.status, value: p.amount }))}
                        config={{ width: 300, height: 300 }}
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                    <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-orange-600" />
                      Payment Methods (Last 30 Days)
                    </h3>
                    <div className="h-72">
                      <DonutChart
                        data={analytics.paymentMethods.map(p => ({ label: p.method, value: p.amount }))}
                        config={{ width: 300, height: 300 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Member Status */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                  <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-600" />
                    Member Status Breakdown
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {analytics.memberStatus.map(m => (
                      <div key={m.status} className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-center">
                        <p className="text-2xl font-extrabold text-[var(--color-primary)]">{m.count}</p>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-1">{m.status}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Members & Expiring/Overdue */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                    <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4 flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5 text-green-600" />
                      Top Members by Attendance
                    </h3>
                    {analytics.topMembers.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.topMembers.map((m, i) => (
                          <div key={m.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-sm">
                                {i + 1}
                              </span>
                              <div>
                                <p className="font-semibold dark:text-white">{m.name}</p>
                                <p className="text-xs text-gray-500">{m.email}</p>
                              </div>
                            </div>
                            <span className="text-lg font-extrabold text-[var(--color-primary)]">{m.checkIns}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No attendance data yet</p>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
                    <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4 flex items-center gap-2">
                      <ArrowDownRight className="w-5 h-5 text-amber-600" />
                      Expiring Memberships & Overdue Fees
                    </h3>
                    <div className="space-y-4">
                      {analytics.expiringSoon.length > 0 ? (
                        <>
                          <h4 className="text-sm font-bold text-amber-600 mb-2">Expiring Soon</h4>
                          {analytics.expiringSoon.slice(0, 5).map(e => (
                            <div key={e.member} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                              <p className="font-semibold dark:text-white">{e.member}</p>
                              <p className="text-xs text-gray-500">{e.plan} · {e.daysLeft} days left</p>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-green-600 text-sm mb-4">No expiring memberships</p>
                      )}
                      {analytics.overdueFees.length > 0 ? (
                        <>
                          <h4 className="text-sm font-bold text-red-600 mb-2 mt-4">Overdue Fees</h4>
                          {analytics.overdueFees.slice(0, 5).map(f => (
                            <div key={f.member} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                              <p className="font-semibold dark:text-white">{f.member}</p>
                              <p className="text-xs text-gray-500">₹{f.amount.toLocaleString('en-IN')} · Due {f.dueDate}</p>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-green-600 text-sm">No overdue fees</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">No analytics data available</div>
            )}
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
                  {branches.length > 0 && branchFilterSelect}
                  <span className="text-xs font-semibold text-amber-500">{pendingMembers} pending approval</span>
                </div>
              </div>
              {membersLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Name', 'Email', 'Plan', 'Branch', 'Joined', 'Status', 'Action'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {filteredMembers.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">{memberSearch ? 'No members match your search.' : 'No members yet.'}</td></tr>
                      ) : filteredMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-4 font-semibold dark:text-white">{m.user?.username}</td>
                          <td className="px-6 py-4 text-gray-500">{m.user?.email}</td>
                          <td className="px-6 py-4 text-gray-500">{m.membershipPlan?.name || '—'}</td>
                          <td className="px-6 py-4">
                            {branches.length > 0 ? (
                              <select
                                className="text-sm border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 bg-transparent text-gray-600 dark:text-gray-300"
                                value={m.branch?.id || ''}
                                onChange={(e) => assignMemberBranch.mutate({ id: m.id, branchId: e.target.value })}
                              >
                                <option value="">—</option>
                                {branches.map((b) => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
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
                              <div className="flex items-center gap-2">
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
                                <button
                                  onClick={() => { if (window.confirm(`Permanently delete member ${m.user?.username}? This removes their fees, memberships, attendance and bookings.`)) deleteMember.mutate(m.id); }}
                                  className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 font-semibold text-sm"
                                  title="Delete member permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => updateMemberStatus.mutate({ id: m.id, status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                                  className="text-sm font-semibold text-gray-500 hover:text-[var(--color-primary)] hover:underline"
                                >
                                  {m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => { if (window.confirm(`Permanently delete member ${m.user?.username}? This removes their fees, memberships, attendance and bookings.`)) deleteMember.mutate(m.id); }}
                                  className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 font-semibold text-sm"
                                  title="Delete member permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
                {branches.length > 0 && (
                  <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={addMemberForm.branchId} onChange={(e) => setAddMemberForm({ ...addMemberForm, branchId: e.target.value })}>
                    <option value="">No branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
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
                      <p className="text-xs text-gray-400 mt-1.5">Record offline payments here — members can also pay pending fees online via Razorpay.</p>
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
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                    <input className="input-field" value={feeForm.notes} onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })} placeholder="Optional payment notes" maxLength={1000} />
                  </div>
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
                          {['Member', 'Amount', 'Due Date', 'Status', 'Notes', 'Actions'].map((h) => (
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
<td className="px-6 py-4 text-gray-500 max-w-[200px] truncate" title={f.notes || ''}>{f.notes || '—'}</td>
                             <td className="px-6 py-4">
                               <div className="flex items-center gap-2">
                                 {f.status !== 'PAID' && (
                                   <button
                                     onClick={() => {
                                       const notes = prompt('Add payment notes (optional):');
                                       updateFeeStatus.mutate({ id: f.id, status: 'PAID', notes: notes || undefined });
                                     }}
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
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center gap-3">
                  <h2 className="font-bold text-lg dark:text-white">Today's Attendance ({attendance.length})</h2>
                  <div className="flex items-center gap-3">
                    {branches.length > 0 && branchFilterSelect}
                    <span className="text-xs font-semibold text-blue-500">{stats?.attendanceToday ?? 0} check-ins</span>
                  </div>
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
                  {branches.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Branch</label>
                      <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={staffForm.branchId} onChange={(e) => setStaffForm({ ...staffForm, branchId: e.target.value })}>
                        <option value="">No branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
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
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="font-bold text-lg dark:text-white">Team ({staffData?.trainers.length || 0} trainers · {staffData?.staff.length || 0} staff)</h2>
                  {branches.length > 0 && branchFilterSelect}
                </div>
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

        {/* Notices / Announcements */}
        {activeTab === 'notices' && (
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
              <h3 className="font-bold text-lg dark:text-white mb-4">{editingNotice ? 'Edit Notice' : 'Post Announcement'}</h3>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingNotice) updateNoticeMut.mutate({ id: editingNotice.id, data: noticeForm });
                  else createNoticeMut.mutate(noticeForm);
                }}
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
                  <input className="input-field" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} placeholder="e.g. Closed on Monday for maintenance" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Content</label>
                  <textarea className="input-field" rows={5} value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} placeholder="What members should know…" required />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1 justify-center" disabled={createNoticeMut.isPending || updateNoticeMut.isPending || !branch?.id}>
                    {editingNotice ? 'Save Changes' : 'Publish Notice'}
                  </button>
                  {editingNotice && (
                    <button type="button" className="btn-outline px-5" onClick={() => { setEditingNotice(null); setNoticeForm({ title: '', content: '' }); }}>Cancel</button>
                  )}
                </div>
                {createNoticeMut.isError && <p className="text-red-600 text-sm">{(createNoticeMut.error as any)?.response?.data?.error || 'Failed to publish notice.'}</p>}
              </form>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <h2 className="font-bold text-lg dark:text-white">Announcements ({notices.length})</h2>
                <p className="text-xs text-gray-400 mt-0.5">Shown to members, trainers and staff on their dashboards.</p>
              </div>
              {noticesLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : notices.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No announcements yet.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[560px] overflow-y-auto">
                  {notices.map((n: any) => (
                    <div key={n.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[var(--color-deepgray)] dark:text-white">{n.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingNotice(n); setNoticeForm({ title: n.title, content: n.content }); }}
                            className="p-2 rounded-lg text-gray-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (window.confirm(`Delete "${n.title}"?`)) deleteNoticeMut.mutate(n.id); }}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Branch Settings */}
        {activeTab === 'branch' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-8">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="font-bold text-lg dark:text-white">Branches</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your gym's physical locations. Members, staff and classes can be assigned to a branch.</p>
                </div>
                {branchFilterSelect}
              </div>

              {branchesLoading ? (
                <div className="h-24 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
              ) : branches.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No branches yet. Add your first branch below.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {branches.map((b) => (
                    <div key={b.id} className={`rounded-xl border p-4 ${b.isActive ? 'border-gray-100 dark:border-white/10' : 'border-gray-100 dark:border-white/10 opacity-60'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[var(--color-deepgray)] dark:text-white flex items-center gap-2">
                            {b.name}
                            {b.isActive ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Disabled</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{b.address} · {b.city}, {b.state}</p>
                          {b.phone && <p className="text-xs text-gray-400 mt-0.5">+91 {b.phone}</p>}
                          <p className="text-xs text-gray-400 mt-1.5">
                            {b._count?.members ?? 0} members · {b._count?.trainers ?? 0} trainers · {b._count?.staff ?? 0} staff · {b._count?.classes ?? 0} classes
                          </p>
                        </div>
                        {b.isActive && (
                          <button
                            onClick={() => { if (window.confirm(`Disable branch "${b.name}"? Members/staff assigned to it must be moved to another branch first.`)) disableBranchMut.mutate(b.id); }}
                            disabled={disableBranchMut.isPending}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline shrink-0"
                          >
                            Disable
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="font-bold text-lg dark:text-white mb-4">Add Branch</h3>
              <form
                className="grid sm:grid-cols-2 gap-4"
                onSubmit={(e) => { e.preventDefault(); createBranchMut.mutate(newBranchForm); }}
              >
                <input className="input-field" placeholder="Branch Name (e.g. Andheri West)" value={newBranchForm.name} onChange={(e) => setNewBranchForm({ ...newBranchForm, name: e.target.value })} required />
                <input className="input-field" placeholder="Address" value={newBranchForm.address} onChange={(e) => setNewBranchForm({ ...newBranchForm, address: e.target.value })} required />
                <input className="input-field" placeholder="City" value={newBranchForm.city} onChange={(e) => setNewBranchForm({ ...newBranchForm, city: e.target.value })} required />
                <input className="input-field" placeholder="State" value={newBranchForm.state} onChange={(e) => setNewBranchForm({ ...newBranchForm, state: e.target.value })} required />
                <input className="input-field" placeholder="Phone (optional)" value={newBranchForm.phone} onChange={(e) => setNewBranchForm({ ...newBranchForm, phone: e.target.value })} />
                <button type="submit" disabled={createBranchMut.isPending || !branch?.id} className="btn-primary py-2.5">
                  <Plus className="w-4 h-4" /> {createBranchMut.isPending ? 'Adding…' : 'Add Branch'}
                </button>
                {createBranchMut.isError && (
                  <p className="sm:col-span-2 text-sm text-red-600">{(createBranchMut.error as any)?.response?.data?.error || 'Failed to add branch.'}</p>
                )}
              </form>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-8 max-w-2xl">
              <h2 className="font-bold text-lg dark:text-white mb-6">Gym Settings</h2>
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
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-8">
              <h2 className="font-bold text-lg dark:text-white mb-4">Expenses</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Expenses</p>
                  <p className="text-2xl font-extrabold text-red-500">₹{(expenseSummary?.totalExpenses || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">This Month</p>
                  <p className="text-2xl font-extrabold text-amber-500">₹{(expenseSummary?.thisMonth || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Recurring</p>
                  <p className="text-2xl font-extrabold text-blue-500">{expenseSummary?.recurringCount || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Records</p>
                  <p className="text-2xl font-extrabold text-[var(--color-primary)]">{expenseSummary?.totalRecords || 0}</p>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createExpenseMut.mutate(expenseForm); }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <input className="input-field" placeholder="Category" value={expenseForm.category} onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))} required />
                <input className="input-field" placeholder="Description" value={expenseForm.description} onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))} required />
                <input className="input-field" type="number" placeholder="Amount" value={expenseForm.amount || ''} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: Number(e.target.value) }))} required />
                <input className="input-field" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))} />
                <button type="submit" disabled={createExpenseMut.isPending} className="btn-primary py-2">{createExpenseMut.isPending ? 'Adding…' : 'Add Expense'}</button>
              </form>
              {expensesLoading ? (
                <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Category', 'Description', 'Amount', 'Date', 'Recurring', 'Actions'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {(expensesData?.expenses || []).map((exp: any) => (
                        <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-3 font-semibold dark:text-white">{exp.category}</td>
                          <td className="px-6 py-3 text-gray-500">{exp.description}</td>
                          <td className="px-6 py-3 font-semibold text-red-500">₹{exp.amount.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-gray-500">{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                          <td className="px-6 py-3">{exp.isRecurring ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}</td>
                          <td className="px-6 py-3">
                            <button onClick={() => deleteExpenseMut.mutate(exp.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-8">
              <h2 className="font-bold text-lg dark:text-white mb-4">Inventory & POS</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Products</p>
                  <p className="text-2xl font-extrabold text-[var(--color-primary)]">{products.length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Low Stock</p>
                  <p className="text-2xl font-extrabold text-red-500">{products.filter((p: any) => p.stock <= p.minimumStock).length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Categories</p>
                  <p className="text-2xl font-extrabold text-blue-500">{categories.length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Sales</p>
                  <p className="text-2xl font-extrabold text-green-600">₹{sales.reduce((s: number, sale: any) => s + sale.finalAmount, 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createProductMut.mutate(productForm); }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <input className="input-field" placeholder="Product Name" value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} required />
                <input className="input-field" placeholder="SKU" value={productForm.sku} onChange={(e) => setProductForm((p) => ({ ...p, sku: e.target.value }))} />
                <input className="input-field" type="number" placeholder="Purchase Price" value={productForm.purchasePrice || ''} onChange={(e) => setProductForm((p) => ({ ...p, purchasePrice: Number(e.target.value) }))} required />
                <input className="input-field" type="number" placeholder="Selling Price" value={productForm.sellingPrice || ''} onChange={(e) => setProductForm((p) => ({ ...p, sellingPrice: Number(e.target.value) }))} required />
                <input className="input-field" type="number" placeholder="Stock" value={productForm.stock || ''} onChange={(e) => setProductForm((p) => ({ ...p, stock: Number(e.target.value) }))} required />
                <input className="input-field" type="number" placeholder="Min Stock" value={productForm.minimumStock || ''} onChange={(e) => setProductForm((p) => ({ ...p, minimumStock: Number(e.target.value) }))} />
                <select className="input-field" value={productForm.categoryId} onChange={(e) => setProductForm((p) => ({ ...p, categoryId: e.target.value }))}>
                  <option value="">No Category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="submit" disabled={createProductMut.isPending} className="btn-primary py-2">{createProductMut.isPending ? 'Adding…' : 'Add Product'}</button>
              </form>
              {productsLoading ? (
                <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Name', 'SKU', 'Purchase', 'Selling', 'Stock', 'Category', 'Actions'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {products.map((prod: any) => (
                        <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-3 font-semibold dark:text-white">{prod.name}</td>
                          <td className="px-6 py-3 text-gray-500">{prod.sku || '—'}</td>
                          <td className="px-6 py-3 text-gray-500">₹{prod.purchasePrice}</td>
                          <td className="px-6 py-3 font-semibold text-green-600">₹{prod.sellingPrice}</td>
                          <td className="px-6 py-3"><span className={prod.stock <= prod.minimumStock ? 'text-red-500 font-bold' : 'dark:text-white'}>{prod.stock}</span></td>
                          <td className="px-6 py-3 text-gray-500">{prod.category?.name || '—'}</td>
                          <td className="px-6 py-3">
                            <button onClick={() => deleteProductMut.mutate(prod.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-8">
              <h2 className="font-bold text-lg dark:text-white mb-4">Equipment</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Equipment</p>
                  <p className="text-2xl font-extrabold text-[var(--color-primary)]">{equipment.length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Good Condition</p>
                  <p className="text-2xl font-extrabold text-green-600">{equipment.filter((e: any) => e.condition === 'EXCELLENT' || e.condition === 'GOOD').length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Needs Repair</p>
                  <p className="text-2xl font-extrabold text-amber-500">{equipment.filter((e: any) => e.condition === 'FAIR' || e.condition === 'POOR').length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Value</p>
                  <p className="text-2xl font-extrabold text-blue-500">₹{equipment.reduce((s: number, e: any) => s + (e.purchaseCost || 0), 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); addEquipMut.mutate(equipForm); }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <input className="input-field" placeholder="Equipment Name" value={equipForm.name} onChange={(e) => setEquipForm((p) => ({ ...p, name: e.target.value }))} required />
                <input className="input-field" placeholder="Serial Number" value={equipForm.serialNumber} onChange={(e) => setEquipForm((p) => ({ ...p, serialNumber: e.target.value }))} />
                <input className="input-field" type="number" placeholder="Purchase Cost" value={equipForm.purchaseCost || ''} onChange={(e) => setEquipForm((p) => ({ ...p, purchaseCost: Number(e.target.value) }))} />
                <input className="input-field" type="date" placeholder="Purchase Date" value={equipForm.purchaseDate} onChange={(e) => setEquipForm((p) => ({ ...p, purchaseDate: e.target.value }))} />
                <input className="input-field" placeholder="Location" value={equipForm.location} onChange={(e) => setEquipForm((p) => ({ ...p, location: e.target.value }))} />
                <select className="input-field" value={equipForm.condition} onChange={(e) => setEquipForm((p) => ({ ...p, condition: e.target.value }))}>
                  {['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'OUT_OF_SERVICE'].map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
                <button type="submit" disabled={addEquipMut.isPending} className="btn-primary py-2">{addEquipMut.isPending ? 'Adding…' : 'Add Equipment'}</button>
              </form>
              {equipmentLoading ? (
                <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Name', 'Serial', 'Condition', 'Location', 'Value', 'Actions'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {equipment.map((eq: any) => (
                        <tr key={eq.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-3 font-semibold dark:text-white">{eq.name}</td>
                          <td className="px-6 py-3 text-gray-500">{eq.serialNumber || '—'}</td>
                          <td className="px-6 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${eq.condition === 'EXCELLENT' || eq.condition === 'GOOD' ? 'bg-green-100 text-green-700' : eq.condition === 'FAIR' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{eq.condition}</span></td>
                          <td className="px-6 py-3 text-gray-500">{eq.location || '—'}</td>
                          <td className="px-6 py-3 font-semibold dark:text-white">₹{(eq.purchaseCost || 0).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3">
                            <button onClick={() => deleteEquipMut.mutate(eq.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-8">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-bold text-lg dark:text-white">Group Classes</h2>
                {branches.length > 0 && branchFilterSelect}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Classes</p>
                  <p className="text-2xl font-extrabold text-[var(--color-primary)]">{gymClasses.length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Active Classes</p>
                  <p className="text-2xl font-extrabold text-green-600">{gymClasses.filter((c: any) => c.isActive).length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Bookings</p>
                  <p className="text-2xl font-extrabold text-blue-500">{gymClasses.reduce((s: number, c: any) => s + (c._count?.bookings || 0), 0)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Avg Capacity</p>
                  <p className="text-2xl font-extrabold text-amber-500">{gymClasses.length ? Math.round(gymClasses.reduce((s: number, c: any) => s + c.capacity, 0) / gymClasses.length) : 0}</p>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createClassMut.mutate(classForm); }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <input className="input-field" placeholder="Class Name" value={classForm.name} onChange={(e) => setClassForm((p) => ({ ...p, name: e.target.value }))} required />
                <input className="input-field" type="number" placeholder="Capacity" value={classForm.capacity || ''} onChange={(e) => setClassForm((p) => ({ ...p, capacity: Number(e.target.value) }))} required />
                <input className="input-field" type="number" placeholder="Duration (min)" value={classForm.duration || ''} onChange={(e) => setClassForm((p) => ({ ...p, duration: Number(e.target.value) }))} required />
                <select className="input-field" value={classForm.dayOfWeek} onChange={(e) => setClassForm((p) => ({ ...p, dayOfWeek: e.target.value }))}>
                  <option value="">Any Day</option>
                  {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input className="input-field" type="time" value={classForm.startTime} onChange={(e) => setClassForm((p) => ({ ...p, startTime: e.target.value }))} />
                <input className="input-field" type="time" value={classForm.endTime} onChange={(e) => setClassForm((p) => ({ ...p, endTime: e.target.value }))} />
                <input className="input-field" placeholder="Location" value={classForm.location} onChange={(e) => setClassForm((p) => ({ ...p, location: e.target.value }))} />
                {branches.length > 0 && (
                  <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={classForm.branchId} onChange={(e) => setClassForm((p) => ({ ...p, branchId: e.target.value }))}>
                    <option value="">No branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
                <button type="submit" disabled={createClassMut.isPending} className="btn-primary py-2">{createClassMut.isPending ? 'Creating…' : 'Create Class'}</button>
              </form>
              {classesLoading ? (
                <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Name', 'Day', 'Time', 'Duration', 'Capacity', 'Branch', 'Bookings', 'Actions'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {gymClasses.map((cls: any) => (
                        <tr key={cls.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-3 font-semibold dark:text-white">{cls.name}</td>
                          <td className="px-6 py-3 text-gray-500">{cls.dayOfWeek || '—'}</td>
                          <td className="px-6 py-3 text-gray-500">{cls.startTime || '—'} - {cls.endTime || '—'}</td>
                          <td className="px-6 py-3 text-gray-500">{cls.duration}m</td>
                          <td className="px-6 py-3 dark:text-white">{cls.capacity}</td>
                          <td className="px-6 py-3 text-gray-500">{cls.branch?.name || '—'}</td>
                          <td className="px-6 py-3"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{cls._count?.bookings || 0}</span></td>
                          <td className="px-6 py-3">
                            <button onClick={() => deleteClassMut.mutate(cls.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payslips Tab */}
        {activeTab === 'payslips' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-8">
              <h2 className="font-bold text-lg dark:text-white mb-4">Payroll & Payslips</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Paid</p>
                  <p className="text-2xl font-extrabold text-green-600">₹{(payslipSummary?.totalPaid || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Pending</p>
                  <p className="text-2xl font-extrabold text-amber-500">₹{(payslipSummary?.totalPending || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Payslips</p>
                  <p className="text-2xl font-extrabold text-blue-500">{payslipSummary?.totalPayslips || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Year</p>
                  <p className="text-2xl font-extrabold text-[var(--color-primary)]">{payslipSummary?.year || new Date().getFullYear()}</p>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createPayslipMut.mutate(payslipForm); }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <input className="input-field" placeholder="Staff User ID" value={payslipForm.userId} onChange={(e) => setPayslipForm((p) => ({ ...p, userId: e.target.value }))} required />
                <select className="input-field" value={payslipForm.month} onChange={(e) => setPayslipForm((p) => ({ ...p, month: Number(e.target.value) }))}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en-IN', { month: 'long' })}</option>)}
                </select>
                <input className="input-field" type="number" placeholder="Basic Salary" value={payslipForm.basicSalary || ''} onChange={(e) => setPayslipForm((p) => ({ ...p, basicSalary: Number(e.target.value) }))} required />
                <input className="input-field" type="number" placeholder="Bonuses" value={payslipForm.bonuses || ''} onChange={(e) => setPayslipForm((p) => ({ ...p, bonuses: Number(e.target.value) }))} />
                <input className="input-field" type="number" placeholder="Deductions" value={payslipForm.deductions || ''} onChange={(e) => setPayslipForm((p) => ({ ...p, deductions: Number(e.target.value) }))} />
                <button type="submit" disabled={createPayslipMut.isPending} className="btn-primary py-2">{createPayslipMut.isPending ? 'Creating…' : 'Create Payslip'}</button>
              </form>
              {payslipsLoading ? (
                <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Staff', 'Month', 'Year', 'Basic', 'Bonuses', 'Deductions', 'Net Pay', 'Status', 'Actions'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {payslips.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-3 font-semibold dark:text-white">{p.user?.username}</td>
                          <td className="px-6 py-3 text-gray-500">{new Date(0, p.month - 1).toLocaleString('en-IN', { month: 'short' })}</td>
                          <td className="px-6 py-3 text-gray-500">{p.year}</td>
                          <td className="px-6 py-3 text-gray-500">₹{p.basicSalary.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-green-600">₹{p.bonuses.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-red-500">₹{p.deductions.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 font-bold dark:text-white">₹{p.netPay.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span></td>
                          <td className="px-6 py-3 flex gap-2">
                            {p.status !== 'PAID' && (
                              <button onClick={() => updatePayslipStatusMut.mutate({ id: p.id, status: 'PAID' })} className="text-green-500 hover:text-green-700"><CheckCircle className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => deletePayslipMut.mutate(p.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-8">
              <h2 className="font-bold text-lg dark:text-white mb-4">Referral Program</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Referrals</p>
                  <p className="text-2xl font-extrabold text-[var(--color-primary)]">{referralStats?.totalReferrals || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Pending</p>
                  <p className="text-2xl font-extrabold text-amber-500">{referralStats?.pendingReferrals || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Completed</p>
                  <p className="text-2xl font-extrabold text-green-600">{referralStats?.completedReferrals || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Rewards</p>
                  <p className="text-2xl font-extrabold text-blue-500">₹{(referralStats?.totalRewardValue || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createReferralMut.mutate(referralForm); }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <input className="input-field" placeholder="Referrer User ID" value={referralForm.userId} onChange={(e) => setReferralForm((p) => ({ ...p, userId: e.target.value }))} required />
                <input className="input-field" placeholder="Referred User ID" value={referralForm.referredUserId} onChange={(e) => setReferralForm((p) => ({ ...p, referredUserId: e.target.value }))} required />
                <select className="input-field" value={referralForm.rewardType} onChange={(e) => setReferralForm((p) => ({ ...p, rewardType: e.target.value }))}>
                  <option value="CREDIT">Credit</option>
                  <option value="DISCOUNT">Discount</option>
                  <option value="FREE_MONTH">Free Month</option>
                </select>
                <input className="input-field" type="number" placeholder="Reward Value" value={referralForm.rewardValue || ''} onChange={(e) => setReferralForm((p) => ({ ...p, rewardValue: Number(e.target.value) }))} required />
                <button type="submit" disabled={createReferralMut.isPending} className="btn-primary py-2">{createReferralMut.isPending ? 'Creating…' : 'Create Referral'}</button>
              </form>
              {referralsLoading ? (
                <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Code', 'Reward Type', 'Value', 'Status', 'Created', 'Actions'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {referrals.map((ref: any) => (
                        <tr key={ref.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-3 font-mono text-sm dark:text-white">{ref.referralCode}</td>
                          <td className="px-6 py-3 text-gray-500">{ref.rewardType}</td>
                          <td className="px-6 py-3 font-semibold dark:text-white">₹{ref.rewardValue.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${ref.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : ref.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{ref.status}</span></td>
                          <td className="px-6 py-3 text-gray-500">{new Date(ref.createdAt).toLocaleDateString('en-IN')}</td>
                          <td className="px-6 py-3">
                            {ref.status !== 'COMPLETED' && (
                              <button onClick={() => updateReferralStatusMut.mutate({ id: ref.id, status: 'COMPLETED' })} className="text-green-500 hover:text-green-700"><CheckCircle className="w-4 h-4" /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
