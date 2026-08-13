import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Building2, Users, Settings, BarChart3, CheckCircle, Clock,
  Plus, Pencil, Trash2, Search, Mail, FileText, Star, XCircle, Diamond, CreditCard,
  DollarSign, AlertTriangle, MessageSquare, Archive, MapPinned, Pin, Tag, FileCode
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import api, { downloadFile } from '../services/api';
import { getPendingBranches, approveBranch, rejectBranch, type PendingBranch } from '../api/branch.api';

type AnalyticsData = {
  // Basic metrics
  totalGyms: number;
  activeGyms: number;
  pendingGyms: number;
  totalMembers: number;
  pendingMembers: number;
  totalStaff: number;
  totalTrainers: number;
  activeMembers: number;
  platformRevenue: number;
  
  // SaaS metrics
  mrr: number;
  arr: number;
  arpu: number;
  cltv: number;
  churnRate: number;
  churnedCount: number;
  newSubscriptionsThisMonth: number;
  trialConversionRate: number;
  failedPayments: number;
  
  // Breakdowns
  revenueByPlan: Record<string, number>;
  gymsByStatus: Record<string, number>;
  monthlyRevenueTrend: Array<{ month: string; fees: number; subscriptions: number; total: number }>;
  topGyms: Array<{ id: string; name: string; city: string; memberCount: number; plan: string; subscriptionStatus: string }>;
};

type Gym = {
  id: string;
  name: string;
  address: string | null;
  city: string;
  state: string;
  gstNumber: string | null;
  logoUrl: string | null;
  imageUrl: string | null;
  isApproved: boolean;
  createdAt: string;
  owner?: { username: string; email: string; phone: string | null } | null;
};

type User = {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  memberDetails?: { status: string; gym?: { name: string } | null } | null;
  ownedGyms?: { name: string; isApproved: boolean }[];
};

type Faq = { id: string; question: string; answer: string; category: string | null; isActive: boolean };

type Testimonial = { id: string; name: string; role: string; content: string; gymName: string | null; rating: number; featured: boolean; isActive: boolean };

type SiteContent = { id: string; key: string; value: string; section: string | null; isActive: boolean };

type Ticket = {
  id: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  createdAt: string;
  user?: { username: string; email: string } | null;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user?: { username: string; email: string } | null;
};

type SaaSPlan = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  monthlyPrice: number;
  maxGyms: number;
  maxMembers: number | null;
  maxTrainers: number | null;
  maxStaff: number | null;
  advancedReports: boolean;
  isActive: boolean;
};

type Subscription = {
  id: string;
  status: string;
  amount: number;
  startDate: string;
  endDate: string;
  gym: { id: string; name: string; city: string };
  plan: { id: string; name: string; code: string; monthlyPrice: number };
};

type PlatformMessage = {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  createdAt: string;
};

type PlatformFee = {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  member?: { user?: { username: string } | null } | null;
  gym?: { name: string } | null;
};

const ROLES = ['ALL', 'SUPER_ADMIN', 'GYM_ADMIN', 'MEMBER', 'TRAINER', 'STAFF'];
const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  RESOLVED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  CLOSED: 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400',
};
const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  HIGH: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  URGENT: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) => (
  <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{label}</p>
    <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const Panel = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
    <div className="px-6 py-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-bold text-lg text-[var(--color-deepgray)] dark:text-white">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="p-10 text-center text-gray-400">{text}</div>
);

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const qc = useQueryClient();

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () => api.get('/admin/analytics').then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: gyms = [], isLoading: gymsLoading } = useQuery<Gym[]>({
    queryKey: ['admin-gyms'],
    queryFn: () => api.get('/admin/gyms').then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: faqs = [], isLoading: faqsLoading } = useQuery<Faq[]>({
    queryKey: ['admin-faqs'],
    queryFn: () => api.get('/admin/cms/faqs').then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: testimonials = [], isLoading: testisLoading } = useQuery<Testimonial[]>({
    queryKey: ['admin-testimonials'],
    queryFn: () => api.get('/admin/cms/testimonials').then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: siteContent = [], isLoading: siteContentLoading } = useQuery<SiteContent[]>({
    queryKey: ['admin-site-content'],
    queryFn: () => api.get('/admin/cms/site-content').then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ['admin-tickets'],
    queryFn: () => api.get('/admin/support/tickets').then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: platformMessages = [], isLoading: messagesLoading } = useQuery<PlatformMessage[]>({
    queryKey: ['admin-messages'],
    queryFn: () => api.get('/admin/messages').then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: pendingBranches = [], isLoading: pendingBranchesLoading } = useQuery<PendingBranch[]>({
    queryKey: ['pending-branches'],
    queryFn: getPendingBranches,
    refetchInterval: 30000,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ['admin-audit'],
    queryFn: () => api.get('/admin/audit-logs').then((r) => r.data),
    refetchInterval: 60000,
  });

  // Chart rendering effect
  React.useEffect(() => {
    if (!analytics?.monthlyRevenueTrend || analyticsLoading) return;
    
    const canvas = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const data = analytics.monthlyRevenueTrend;
    const labels = data.map(d => d.month);
    const feesData = data.map(d => d.fees);
    const subsData = data.map(d => d.subscriptions);
    const totalData = data.map(d => d.total);
    
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#aaa' : '#888';
    const legendTextColor = isDark ? '#e5e5e5' : '#333';

    const maxVal = Math.max(...totalData, ...feesData, ...subsData, 1);
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = axisColor;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round((maxVal * (4 - i)) / 4).toLocaleString('en-IN')}`, padding - 10, y + 4);
    }

    // Draw X-axis labels
    ctx.fillStyle = axisColor;
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
      const x = padding + (chartWidth / (labels.length - 1)) * i;
      ctx.fillText(label, x, canvas.height - 10);
    });
    
    // Draw datasets
    const drawLine = (values: number[], color: string, fillColor: string) => {
      const points = values.map((val, i) => ({
        x: padding + (chartWidth / (labels.length - 1)) * i,
        y: padding + chartHeight - (val / maxVal) * chartHeight
      }));
      
      // Fill area
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding + chartHeight);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding + chartHeight);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      
      // Line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      // Points
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      });
    };
    
    // Draw in order: total (background), fees, subscriptions
    drawLine(totalData, 'rgba(1, 50, 32, 0.8)', 'rgba(1, 50, 32, 0.1)');
    drawLine(feesData, 'rgba(128, 0, 32, 0.8)', 'rgba(128, 0, 32, 0.1)');
    drawLine(subsData, 'rgba(230, 99, 0, 0.8)', 'rgba(230, 99, 0, 0.1)');

    // Legend
    const legendItems = [
      { label: 'Total Revenue', color: 'rgba(1, 50, 32, 0.8)' },
      { label: 'Fees', color: 'rgba(128, 0, 32, 0.8)' },
      { label: 'Subscriptions', color: 'rgba(230, 99, 0, 0.8)' }
    ];

    legendItems.forEach((item, i) => {
      const x = canvas.width - 180;
      const y = 20 + i * 20;
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y, 12, 12);
      ctx.fillStyle = legendTextColor;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x + 18, y + 10);
    });
  }, [analytics?.monthlyRevenueTrend, analyticsLoading, theme]);

  const approve = useMutation({
    mutationFn: (id: string) => api.put(`/admin/gyms/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-gyms'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
  const suspend = useMutation({
    mutationFn: (id: string) => api.put(`/admin/gyms/${id}/suspend`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-gyms'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });

  const [deletingGym, setDeletingGym] = useState<Gym | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const deleteGym = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/gyms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-gyms'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
      setDeletingGym(null);
      setDeleteConfirmText('');
    },
  });

  const [gymForm, setGymForm] = useState<{ name: string; address: string; city: string; state: string; gstNumber: string; logoUrl: string; imageUrl: string }>({ name: '', address: '', city: '', state: '', gstNumber: '', logoUrl: '', imageUrl: '' });
  const [editingGymId, setEditingGymId] = useState<string | null>(null);
  const updateGymProfile = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof gymForm }) => api.put(`/admin/gyms/${id}`, {
      ...data,
      name: data.name || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      gstNumber: data.gstNumber || undefined,
      logoUrl: data.logoUrl || undefined,
      imageUrl: data.imageUrl || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-gyms'] });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
      setEditingGymId(null);
    },
  });
  const openGymEditor = (gym: Gym) => {
    setGymForm({ name: gym.name, address: gym.address || '', city: gym.city, state: gym.state, gstNumber: gym.gstNumber || '', logoUrl: gym.logoUrl || '', imageUrl: gym.imageUrl || '' });
    setEditingGymId(gym.id);
  };

  const { data: platformFees = [], isLoading: feesLoading } = useQuery<PlatformFee[]>({
    queryKey: ['admin-fees'],
    queryFn: () => api.get('/admin/fees').then((r) => r.data),
    refetchInterval: 30000,
  });

  const setUserActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/admin/users/${id}/status`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });

  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: '' });
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const createFaq = useMutation({
    mutationFn: (data: typeof faqForm) => api.post('/admin/cms/faqs', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-faqs'] }); setFaqForm({ question: '', answer: '', category: '' }); },
  });
  const updateFaq = useMutation({
    mutationFn: ({ id, ...data }: Faq) => api.put(`/admin/cms/faqs/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-faqs'] }); setEditingFaq(null); },
  });
  const deleteFaq = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cms/faqs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-faqs'] }),
  });

  const [testiForm, setTestiForm] = useState({ name: '', role: '', content: '', gymName: '', rating: 5, featured: false });
  const [editingTesti, setEditingTesti] = useState<Testimonial | null>(null);
  const createTesti = useMutation({
    mutationFn: (data: typeof testiForm) => api.post('/admin/cms/testimonials', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-testimonials'] }); setTestiForm({ name: '', role: '', content: '', gymName: '', rating: 5, featured: false }); },
  });
  const updateTesti = useMutation({
    mutationFn: ({ id, ...data }: Testimonial) => api.put(`/admin/cms/testimonials/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-testimonials'] }); setEditingTesti(null); },
  });
  const deleteTesti = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cms/testimonials/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-testimonials'] }),
  });

  const [siteContentForm, setSiteContentForm] = useState({ key: '', value: '', section: '', isActive: true });
  const [editingSiteContent, setEditingSiteContent] = useState<SiteContent | null>(null);
  const createSiteContent = useMutation({
    mutationFn: (data: typeof siteContentForm) => api.post('/admin/cms/site-content', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-site-content'] }); setSiteContentForm({ key: '', value: '', section: '', isActive: true }); },
  });
  const updateSiteContent = useMutation({
    mutationFn: ({ id, ...data }: SiteContent) => api.put(`/admin/cms/site-content/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-site-content'] }); setEditingSiteContent(null); },
  });
  const deleteSiteContent = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cms/site-content/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-site-content'] }),
  });

  const updateTicket = useMutation({
    mutationFn: ({ id, status, priority }: { id: string; status?: string; priority?: string }) => api.put(`/admin/support/tickets/${id}`, { status, priority }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tickets'] }),
  });

  const updateMessage = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/admin/messages/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-messages'] }),
  });

  const approveBranchMut = useMutation({
    mutationFn: (id: string) => approveBranch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pending-branches'] }); qc.invalidateQueries({ queryKey: ['admin-audit'] }); },
  });
  const [rejectingBranch, setRejectingBranch] = useState<PendingBranch | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const rejectBranchMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectBranch(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-branches'] });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
      setRejectingBranch(null);
      setRejectReason('');
    },
  });

  const { data: saasPlans = [], isLoading: saasPlansLoading } = useQuery<SaaSPlan[]>({
    queryKey: ['saas-plans'],
    queryFn: () => api.get('/saas/plans', { params: { all: 'true' } }).then((r) => r.data),
    refetchInterval: 30000,
  });
  const { data: subscriptions = [], isLoading: subsLoading } = useQuery<Subscription[]>({
    queryKey: ['saas-subscriptions'],
    queryFn: () => api.get('/saas/subscriptions').then((r) => r.data),
    refetchInterval: 30000,
  });
  const [planForm, setPlanForm] = useState({ name: '', code: '', description: '', monthlyPrice: 0, maxGyms: 1, maxMembers: '', maxTrainers: '', maxStaff: '', features: '' });
  const createPlan = useMutation({
    mutationFn: (data: typeof planForm) => api.post('/saas/plans', {
      ...data,
      description: data.description || null,
      monthlyPrice: Number(data.monthlyPrice) || 0,
      maxGyms: Number(data.maxGyms) || 1,
      maxMembers: data.maxMembers ? Number(data.maxMembers) : null,
      maxTrainers: data.maxTrainers ? Number(data.maxTrainers) : null,
      maxStaff: data.maxStaff ? Number(data.maxStaff) : null,
      features: data.features ? data.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-plans'] }); qc.invalidateQueries({ queryKey: ['admin-audit'] }); setPlanForm({ name: '', code: '', description: '', monthlyPrice: 0, maxGyms: 1, maxMembers: '', maxTrainers: '', maxStaff: '', features: '' }); },
  });
  const togglePlan = useMutation({
    mutationFn: (plan: SaaSPlan) => api.put(`/saas/plans/${plan.id}`, { isActive: !plan.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-plans'] }); qc.invalidateQueries({ queryKey: ['admin-audit'] }); },
  });
  const [subForm, setSubForm] = useState({ gymId: '', planId: '', startDate: '' });
  const createSubscription = useMutation({
    mutationFn: (data: typeof subForm) => api.post('/saas/subscriptions', { ...data, startDate: data.startDate || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-subscriptions'] }); qc.invalidateQueries({ queryKey: ['analytics'] }); qc.invalidateQueries({ queryKey: ['admin-audit'] }); setSubForm({ gymId: '', planId: '', startDate: '' }); },
  });
  const updateSubStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/saas/subscriptions/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-subscriptions'] }); qc.invalidateQueries({ queryKey: ['analytics'] }); qc.invalidateQueries({ queryKey: ['admin-audit'] }); },
  });

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = userSearch.trim().toLowerCase();
    const matchesSearch = !q || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      SUPER_ADMIN: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      GYM_ADMIN: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      MEMBER: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      TRAINER: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      STAFF: 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400',
    };
    return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[role] || styles.MEMBER}`}>{role.replace('_', ' ')}</span>;
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'gyms', label: 'Gyms', icon: Building2 },
    { id: 'branches', label: 'Branch Approvals', icon: MapPinned },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'saas', label: 'SaaS & Subscriptions', icon: Diamond },
    { id: 'cms', label: 'Content (CMS)', icon: LayoutDashboard },
    { id: 'support', label: 'Support', icon: Clock },
    { id: 'messages', label: 'Contact Messages', icon: MessageSquare },
    { id: 'audit', label: 'Audit Logs', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[var(--color-base)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[var(--color-deepgray)] dark:text-white">Platform Control</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Signed in as <strong>{user?.email}</strong></p>
        </div>

        <div className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Platform sections">
          <div className="flex min-w-max gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'branches' && pendingBranches.length > 0 && (
                <span className="bg-amber-400 text-amber-950 text-[10px] font-extrabold px-1.5 rounded-full">{pendingBranches.length}</span>
              )}
            </button>
          ))}
          </div>
        </div>

        {/* ============ ANALYTICS ============ */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {analyticsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => <div key={i} className="h-28 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* Top Row - Core SaaS Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
                  <StatCard 
                    label="Monthly Recurring Revenue" 
                    value={`₹${(analytics?.mrr ?? 0).toLocaleString('en-IN')}`} 
                    sub="MRR" 
                    color="text-[var(--color-primary)]" 
                  />
                  <StatCard 
                    label="Annual Recurring Revenue" 
                    value={`₹${(analytics?.arr ?? 0).toLocaleString('en-IN')}`} 
                    sub="ARR" 
                    color="text-emerald-600" 
                  />
                  <StatCard 
                    label="Churn Rate" 
                    value={`${analytics?.churnRate ?? 0}%`} 
                    sub={`${analytics?.churnedCount ?? 0} churned this month`} 
                    color={((analytics?.churnRate ?? 0) > 5 ? 'text-red-500' : 'text-green-600')} 
                  />
                  <StatCard 
                    label="Customer Lifetime Value" 
                    value={`₹${(analytics?.cltv ?? 0).toLocaleString('en-IN')}`} 
                    sub="CLTV" 
                    color="text-blue-500" 
                  />
                </div>

                {/* Second Row - Growth Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
                  <StatCard 
                    label="ARPU" 
                    value={`₹${(analytics?.arpu ?? 0).toLocaleString('en-IN')}`} 
                    sub="Avg Revenue Per Gym" 
                    color="text-purple-500" 
                  />
                  <StatCard 
                    label="New Subscriptions" 
                    value={analytics?.newSubscriptionsThisMonth ?? 0} 
                    sub="This Month" 
                    color="text-[var(--color-primary)]" 
                  />
                  <StatCard 
                    label="Trial Conversion" 
                    value={`${analytics?.trialConversionRate ?? 0}%`} 
                    sub="Trial → Paid" 
                    color="text-amber-500" 
                  />
                  <StatCard 
                    label="Failed Payments" 
                    value={analytics?.failedPayments ?? 0} 
                    sub="This Month" 
                    color="text-red-500" 
                  />
                </div>

                {/* Third Row - Operational Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
                  <StatCard 
                    label="Total Gyms" 
                    value={analytics?.totalGyms ?? 0} 
                    sub={`${analytics?.activeGyms ?? 0} active`} 
                    color="text-[var(--color-primary)]" 
                  />
                  <StatCard 
                    label="Total Members" 
                    value={analytics?.totalMembers ?? 0} 
                    sub={`${analytics?.activeMembers ?? 0} active`} 
                    color="text-[var(--color-secondary)]" 
                  />
                  <StatCard 
                    label="Platform Revenue" 
                    value={`₹${(analytics?.platformRevenue ?? 0).toLocaleString('en-IN')}`} 
                    sub="All-time fees" 
                    color="text-green-600" 
                  />
                  <StatCard 
                    label="Staff & Trainers" 
                    value={(analytics?.totalStaff ?? 0) + (analytics?.totalTrainers ?? 0)} 
                    sub={`${analytics?.totalTrainers ?? 0} trainers`} 
                    color="text-purple-500" 
                  />
                </div>

                {/* Revenue Trend Chart */}
                <Panel title="Revenue Trend (Last 6 Months)">
                  <div className="h-80">
                    <canvas id="revenueChart" width="800" height="320" role="img" aria-label="Revenue trend chart showing total revenue, fees, and subscriptions over the last six months">Revenue trend chart</canvas>
                  </div>
                </Panel>

                {/* Revenue by Plan & Gym Status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Panel title="Revenue by Plan (MRR)">
                    {Object.entries(analytics?.revenueByPlan || {}).length === 0 ? (
                      <EmptyState text="No active subscriptions yet." />
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(analytics?.revenueByPlan || {}).map(([plan, revenue]) => (
                          <div key={plan} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                                <DollarSign className="w-5 h-5" />
                              </div>
                              <span className="font-semibold dark:text-white">{plan}</span>
                            </div>
                            <span className="font-bold text-[var(--color-primary)]">₹{revenue.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>

                  <Panel title="Gym Status Distribution">
                    <div className="space-y-4">
                      {Object.entries(analytics?.gymsByStatus || {}).map(([status, count]) => {
                        const colors: Record<string, string> = {
                          active: 'text-green-600',
                          pending: 'text-amber-500',
                          trial: 'text-blue-500',
                          past_due: 'text-orange-500',
                          expired: 'text-red-500',
                        };
                        const labels: Record<string, string> = {
                          active: 'Active',
                          pending: 'Pending Approval',
                          trial: 'On Trial',
                          past_due: 'Past Due',
                          expired: 'Expired/Cancelled',
                        };
                        return (
                          <div key={status} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl ${colors[status]}10 ${colors[status]} flex items-center justify-center`}>
                                <Building2 className="w-5 h-5" />
                              </div>
                              <span className="font-semibold dark:text-white">{labels[status] || status}</span>
                            </div>
                            <span className={`font-bold ${colors[status]}`}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </div>

                {/* Top Performing Gyms */}
                <Panel title="Top Gyms by Member Count">
                  {(analytics?.topGyms?.length ?? 0) === 0 ? (
                    <EmptyState text="No gyms with members yet." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5">
                          <tr>
                            {['Gym', 'Location', 'Members', 'Plan', 'Subscription'].map((h) => (
                              <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {analytics?.topGyms?.map((gym) => (
                            <tr key={gym.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                              <td className="px-6 py-4 font-semibold text-[var(--color-deepgray)] dark:text-white">{gym.name}</td>
                              <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{gym.city}</td>
                              <td className="px-6 py-4 font-bold dark:text-white">{gym.memberCount}</td>
                              <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{gym.plan}</td>
                              <td className="px-6 py-4">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                  gym.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                  gym.subscriptionStatus === 'TRIAL' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                  gym.subscriptionStatus === 'PAST_DUE' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                  'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {gym.subscriptionStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>

                {/* Recently Registered Gyms */}
                <Panel title="Recently Registered Gyms">
                  {gymsLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : gyms.length === 0 ? (
                    <EmptyState text="No gyms registered yet." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5">
                          <tr>
                            {['Gym Name', 'Location', 'Owner', 'Registered', 'Status'].map((h) => (
                              <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {gyms.slice(0, 5).map((gym) => (
                            <tr key={gym.id}>
                              <td className="px-6 py-4 font-semibold text-[var(--color-deepgray)] dark:text-white">{gym.name}</td>
                              <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{gym.city}, {gym.state}</td>
                              <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{gym.owner?.email}</td>
                              <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(gym.createdAt).toLocaleDateString('en-IN')}</td>
                              <td className="px-6 py-4">
                                {gym.isApproved ? (
                                  <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Active</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full"><Clock className="w-3 h-3" /> Pending</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>
              </>
            )}
          </div>
        )}

        {/* ============ GYMS ============ */}
        {activeTab === 'gyms' && (
          <Panel title={`Registered Gym Partners (${gyms.length})`}>
            {gymsLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : gyms.length === 0 ? (
              <EmptyState text="No gyms registered yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      {['Gym Name', 'Location', 'Owner', 'Registered', 'Status', 'Action'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {gyms.map((gym) => (
                      <tr key={gym.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-semibold text-[var(--color-deepgray)] dark:text-white">{gym.name}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{gym.city}, {gym.state}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{gym.owner?.email}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(gym.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-6 py-4">
                          {gym.isApproved ? (
                            <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Active</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full"><Clock className="w-3 h-3" /> Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => openGymEditor(gym)} className="inline-flex items-center gap-1 text-gray-500 hover:text-[var(--color-primary)] font-semibold text-sm"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                            {!gym.isApproved ? (
                              <button onClick={() => approve.mutate(gym.id)} disabled={approve.isPending} className="text-green-600 hover:text-green-700 font-semibold text-sm hover:underline disabled:opacity-50">Approve</button>
                            ) : (
                              <button onClick={() => suspend.mutate(gym.id)} disabled={suspend.isPending} className="text-red-600 hover:text-red-700 font-semibold text-sm hover:underline disabled:opacity-50">Suspend</button>
                            )}
                            <button onClick={() => { setDeletingGym(gym); setDeleteConfirmText(''); }} className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 font-semibold text-sm"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* ============ GYM EDITOR ============ */}
        {editingGymId && (
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 mt-6">
            <h3 className="font-bold text-lg text-[var(--color-deepgray)] dark:text-white mb-4">Edit Gym Details</h3>
            <form
              className="grid sm:grid-cols-2 gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                updateGymProfile.mutate({ id: editingGymId, data: gymForm });
              }}
            >
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</span>
                <input className="input-field mt-1" value={gymForm.name} onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">GST Number</span>
                <input className="input-field mt-1" value={gymForm.gstNumber} onChange={(e) => setGymForm({ ...gymForm, gstNumber: e.target.value })} />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address</span>
                <input className="input-field mt-1" value={gymForm.address} onChange={(e) => setGymForm({ ...gymForm, address: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">City</span>
                <input className="input-field mt-1" value={gymForm.city} onChange={(e) => setGymForm({ ...gymForm, city: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">State</span>
                <input className="input-field mt-1" value={gymForm.state} onChange={(e) => setGymForm({ ...gymForm, state: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Logo URL</span>
                <input className="input-field mt-1" value={gymForm.logoUrl} onChange={(e) => setGymForm({ ...gymForm, logoUrl: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Image URL</span>
                <input className="input-field mt-1" value={gymForm.imageUrl} onChange={(e) => setGymForm({ ...gymForm, imageUrl: e.target.value })} />
              </label>
              <div className="sm:col-span-2 flex items-center gap-3">
                <button type="submit" className="btn-primary px-5" disabled={updateGymProfile.isPending}>
                  <CheckCircle className="w-4 h-4" /> {updateGymProfile.isPending ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditingGymId(null)} className="btn-outline px-5">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ============ DELETE GYM CONFIRMATION ============ */}
        {deletingGym && (
          <div className="bg-[var(--color-surface)] rounded-2xl border-2 border-red-200 dark:border-red-900/40 p-6 mt-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[var(--color-deepgray)] dark:text-white">Permanently delete "{deletingGym.name}"?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This deletes the gym and every record tied to it — members, trainers, staff, fees, bookings, subscriptions, classes and more. This cannot be undone.
                </p>
              </div>
            </div>
            <label className="block text-sm mb-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type the gym name to confirm</span>
              <input
                className="input-field mt-1"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deletingGym.name}
                autoFocus
              />
            </label>
            {deleteGym.isError && <p className="text-red-500 text-sm mb-4">Failed to delete gym. Please try again.</p>}
            <div className="flex items-center gap-3">
              <button
                onClick={() => deleteGym.mutate(deletingGym.id)}
                disabled={deleteConfirmText !== deletingGym.name || deleteGym.isPending}
                className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" /> {deleteGym.isPending ? 'Deleting…' : 'Delete Permanently'}
              </button>
              <button type="button" onClick={() => { setDeletingGym(null); setDeleteConfirmText(''); }} className="btn-outline px-5">Cancel</button>
            </div>
          </div>
        )}

        {/* ============ BRANCH APPROVALS ============ */}
        {activeTab === 'branches' && (
          <Panel title={`Pending Branch Requests (${pendingBranches.length})`}>
            {pendingBranchesLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : pendingBranches.length === 0 ? (
              <EmptyState text="No branch requests waiting for review." />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {pendingBranches.map((b) => (
                  <div key={b.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-[var(--color-deepgray)] dark:text-white">{b.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{b.address} · {b.city}, {b.state}{b.phone ? ` · +91 ${b.phone}` : ''}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Requested by <span className="font-semibold">{b.gym.owner.username}</span> ({b.gym.owner.email}) for <span className="font-semibold">{b.gym.name}</span>, {b.gym.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => approveBranchMut.mutate(b.id)}
                        disabled={approveBranchMut.isPending}
                        className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-semibold text-sm hover:underline disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => { setRejectingBranch(b); setRejectReason(''); }}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-sm hover:underline"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {approveBranchMut.isError && (
              <p className="px-6 pb-4 text-sm text-red-600">{(approveBranchMut.error as any)?.response?.data?.error || 'Failed to approve branch.'}</p>
            )}
          </Panel>
        )}

        {/* ============ REJECT BRANCH ============ */}
        {rejectingBranch && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectingBranch(null)}>
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-lg text-[var(--color-deepgray)] dark:text-white mb-1">Reject "{rejectingBranch.name}"?</h3>
              <p className="text-sm text-gray-500 mb-4">The gym owner will see this reason on their dashboard.</p>
              <label className="block text-sm mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reason (optional)</span>
                <textarea className="input-field mt-1" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Address could not be verified" />
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => rejectBranchMut.mutate({ id: rejectingBranch.id, reason: rejectReason || undefined })}
                  disabled={rejectBranchMut.isPending}
                  className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> {rejectBranchMut.isPending ? 'Rejecting…' : 'Reject Branch'}
                </button>
                <button type="button" onClick={() => setRejectingBranch(null)} className="btn-outline px-5">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ============ PAYMENTS ============ */}
        {activeTab === 'payments' && (
          <Panel
            title={`Payments Ledger (${platformFees.length})`}
            action={<span className="text-xs font-semibold text-gray-500">All fees across all gyms</span>}
          >
            {feesLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : platformFees.length === 0 ? (
              <EmptyState text="No fee records yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      {['Member', 'Gym', 'Amount', 'Due', 'Status', 'Receipt'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {platformFees.map((fee) => (
                      <tr key={fee.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-semibold text-[var(--color-deepgray)] dark:text-white">{fee.member?.user?.username || '—'}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{fee.gym?.name || '—'}</td>
                        <td className="px-6 py-4 font-semibold dark:text-white">₹{fee.amount.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(fee.dueDate).toLocaleDateString('en-IN')}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${fee.status === 'PAID' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : fee.status === 'OVERDUE' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>{fee.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => downloadFile(`/fees/${fee.id}/receipt`, `receipt-${fee.id.slice(0, 8)}.pdf`)}
                            disabled={fee.status !== 'PAID'}
                            className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <FileText className="w-3.5 h-3.5" /> {fee.status === 'PAID' ? 'Download' : '—'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* ============ USERS ============ */}
        {activeTab === 'users' && (
          <Panel
            title={`Platform Users (${filteredUsers.length})`}
            action={
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} aria-label="Search users" placeholder="Search users…" className="input-field pl-9! py-2! text-sm" />
                </div>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role" className="input-field py-2! text-sm bg-white! dark:bg-[#1a1a1a]!">
                  {ROLES.map((r) => <option key={r} value={r}>{r === 'ALL' ? 'All roles' : r.replace('_', ' ')}</option>)}
                </select>
              </div>
            }
          >
            {usersLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : filteredUsers.length === 0 ? (
              <EmptyState text="No users match your filters." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      {['User', 'Role', 'Gym / Membership', 'Phone', 'Joined', 'Account'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[var(--color-deepgray)] dark:text-white">{u.username}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</p>
                        </td>
                        <td className="px-6 py-4">{roleBadge(u.role)}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {u.memberDetails ? (
                            <span>{u.memberDetails.gym?.name} <span className={`ml-1 text-xs font-bold ${u.memberDetails.status === 'ACTIVE' ? 'text-green-600' : 'text-amber-500'}`}>({u.memberDetails.status})</span></span>
                          ) : u.ownedGyms?.length ? (
                            u.ownedGyms.map((g) => g.name).join(', ')
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{u.phone || '—'}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-6 py-4">
                          {u.role === 'SUPER_ADMIN' ? (
                            <span className="text-xs font-semibold text-gray-400">—</span>
                          ) : u.isActive ? (
                            <button
                              onClick={() => { if (window.confirm(`Suspend ${u.username}? They will be logged out and blocked from signing in.`)) setUserActive.mutate({ id: u.id, isActive: false }); }}
                              disabled={setUserActive.isPending}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-xs hover:underline disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => setUserActive.mutate({ id: u.id, isActive: true })}
                              disabled={setUserActive.isPending}
                              className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-semibold text-xs hover:underline disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* ============ CMS ============ */}
        {activeTab === 'cms' && (
          <div className="space-y-8">
            <Panel title="FAQs" action={<span className="text-xs font-semibold text-gray-400">{faqs.length} items · shown on Help page</span>}>
              <div className="p-6 border-b border-[var(--color-border)] bg-gray-50/60 dark:bg-white/[0.03]">
                <form
                  className="grid md:grid-cols-[1fr_1.4fr_0.6fr_auto] gap-3 items-start"
                  onSubmit={(e) => { e.preventDefault(); createFaq.mutate(faqForm); }}
                >
                  <input className="input-field" aria-label="FAQ question" placeholder="Question" value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} required />
                  <input className="input-field" aria-label="FAQ answer" placeholder="Answer" value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} required />
                  <input className="input-field" aria-label="FAQ category" placeholder="Category" value={faqForm.category} onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })} />
                  <button type="submit" className="btn-primary justify-center" disabled={createFaq.isPending}><Plus className="w-4 h-4" /> Add</button>
                </form>
              </div>
              {faqsLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : faqs.length === 0 ? (
                <EmptyState text="No FAQs yet. Add your first one above." />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="px-6 py-4 flex items-start justify-between gap-4">
                      {editingFaq?.id === faq.id ? (
                        <div className="flex-1 grid md:grid-cols-[1fr_1.4fr_0.6fr_auto] gap-3 items-start">
                          <input className="input-field text-sm" aria-label="FAQ question" defaultValue={faq.question} onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })} />
                          <input className="input-field text-sm" aria-label="FAQ answer" defaultValue={faq.answer} onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })} />
                          <input className="input-field text-sm" aria-label="FAQ category" placeholder="Category" defaultValue={faq.category ?? ''} onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })} />
                          <div className="flex gap-2">
                            <button onClick={() => updateFaq.mutate(editingFaq)} className="btn-primary text-sm px-4 py-2">Save</button>
                            <button onClick={() => setEditingFaq(null)} className="btn-outline text-sm px-4 py-2">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-[var(--color-deepgray)] dark:text-white">{faq.question}</p>
                              {faq.category && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Tag className="w-3 h-3" /> {faq.category}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{faq.answer}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => updateFaq.mutate({ ...faq, isActive: !faq.isActive })}
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${faq.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}
                            >
                              {faq.isActive ? 'Active' : 'Hidden'}
                            </button>
                            <button onClick={() => setEditingFaq(faq)} aria-label={`Edit FAQ: ${faq.question}`} className="p-2 rounded-lg text-gray-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deleteFaq.mutate(faq.id)} aria-label={`Delete FAQ: ${faq.question}`} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Testimonials" action={<span className="text-xs font-semibold text-gray-400">{testimonials.length} items</span>}>
              <div className="p-6 border-b border-[var(--color-border)] bg-gray-50/60 dark:bg-white/[0.03]">
                <form
                  className="grid md:grid-cols-2 gap-3"
                  onSubmit={(e) => { e.preventDefault(); createTesti.mutate(testiForm); }}
                >
                  <input className="input-field" aria-label="Testimonial name" placeholder="Name" value={testiForm.name} onChange={(e) => setTestiForm({ ...testiForm, name: e.target.value })} required />
                  <input className="input-field" aria-label="Testimonial role" placeholder="Role (e.g. Gym Owner, Pro Trainer)" value={testiForm.role} onChange={(e) => setTestiForm({ ...testiForm, role: e.target.value })} required />
                  <textarea className="input-field md:col-span-2" rows={2} aria-label="Testimonial content" placeholder="Testimonial content" value={testiForm.content} onChange={(e) => setTestiForm({ ...testiForm, content: e.target.value })} required />
                  <input className="input-field" aria-label="Testimonial gym name" placeholder="Gym name" value={testiForm.gymName} onChange={(e) => setTestiForm({ ...testiForm, gymName: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    <input type="checkbox" checked={testiForm.featured} onChange={(e) => setTestiForm({ ...testiForm, featured: e.target.checked })} />
                    Featured
                  </label>
                  <div className="flex items-center gap-4 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Rating:</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button key={r} type="button" onClick={() => setTestiForm({ ...testiForm, rating: r })} aria-label={`${r} stars`}>
                          <Star className={`w-5 h-5 ${r <= testiForm.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                        </button>
                      ))}
                    </div>
                    <button type="submit" className="btn-primary justify-center ml-auto" disabled={createTesti.isPending}><Plus className="w-4 h-4" /> Add</button>
                  </div>
                </form>
              </div>
              {testisLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : testimonials.length === 0 ? (
                <EmptyState text="No testimonials yet." />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {testimonials.map((t) => (
                    <div key={t.id} className="rounded-2xl border border-[var(--color-border)] p-4 bg-gray-50/50 dark:bg-white/[0.03]">
                      {editingTesti?.id === t.id ? (
                        <div className="space-y-2">
                          <input className="input-field text-sm" aria-label="Testimonial name" defaultValue={t.name} onChange={(e) => setEditingTesti({ ...editingTesti, name: e.target.value })} />
                          <input className="input-field text-sm" aria-label="Testimonial role" defaultValue={t.role} onChange={(e) => setEditingTesti({ ...editingTesti, role: e.target.value })} />
                          <textarea className="input-field text-sm" rows={2} aria-label="Testimonial content" defaultValue={t.content} onChange={(e) => setEditingTesti({ ...editingTesti, content: e.target.value })} />
                          <input className="input-field text-sm" aria-label="Testimonial gym name" placeholder="Gym name" defaultValue={t.gymName ?? ''} onChange={(e) => setEditingTesti({ ...editingTesti, gymName: e.target.value })} />
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                            <input type="checkbox" checked={editingTesti.featured} onChange={(e) => setEditingTesti({ ...editingTesti, featured: e.target.checked })} />
                            Featured
                          </label>
                          <div className="flex gap-2">
                            <button onClick={() => updateTesti.mutate(editingTesti)} className="btn-primary text-sm px-4 py-2">Save</button>
                            <button onClick={() => setEditingTesti(null)} className="btn-outline text-sm px-4 py-2">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex gap-1">
                              {[...Array(t.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                            </div>
                            {t.featured && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Pin className="w-3 h-3" /> Featured</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{t.content}"</p>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm font-bold text-[var(--color-deepgray)] dark:text-white">{t.name} <span className="font-medium text-xs text-gray-500">· {t.role}{t.gymName ? ` · ${t.gymName}` : ''}</span></p>
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateTesti.mutate({ ...t, isActive: !t.isActive })} className={`text-xs font-bold px-2 py-1 rounded-full ${t.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>{t.isActive ? 'Active' : 'Hidden'}</button>
                              <button onClick={() => setEditingTesti(t)} aria-label={`Edit testimonial by ${t.name}`} className="p-1.5 rounded-lg text-gray-500 hover:text-[var(--color-primary)]"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteTesti.mutate(t.id)} aria-label={`Delete testimonial by ${t.name}`} className="p-1.5 rounded-lg text-gray-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Site Content" action={<span className="text-xs font-semibold text-gray-400">{siteContent.length} entries</span>}>
              <div className="p-6 border-b border-[var(--color-border)] bg-gray-50/60 dark:bg-white/[0.03]">
                <form
                  className="grid md:grid-cols-[0.8fr_1.4fr_0.6fr_auto] gap-3 items-start"
                  onSubmit={(e) => { e.preventDefault(); createSiteContent.mutate(siteContentForm); }}
                >
                  <input className="input-field" aria-label="Site content key" placeholder="Key" value={siteContentForm.key} onChange={(e) => setSiteContentForm({ ...siteContentForm, key: e.target.value })} required />
                  <textarea className="input-field" rows={1} aria-label="Site content value" placeholder="Value" value={siteContentForm.value} onChange={(e) => setSiteContentForm({ ...siteContentForm, value: e.target.value })} required />
                  <input className="input-field" aria-label="Site content section" placeholder="Section" value={siteContentForm.section} onChange={(e) => setSiteContentForm({ ...siteContentForm, section: e.target.value })} />
                  <button type="submit" className="btn-primary justify-center" disabled={createSiteContent.isPending}><Plus className="w-4 h-4" /> Add</button>
                </form>
              </div>
              {siteContentLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : siteContent.length === 0 ? (
                <EmptyState text="No site content entries yet. Add your first one above." />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {siteContent.map((c) => (
                    <div key={c.id} className="px-6 py-4 flex items-start justify-between gap-4">
                      {editingSiteContent?.id === c.id ? (
                        <div className="flex-1 grid md:grid-cols-[0.8fr_1.4fr_0.6fr_auto] gap-3 items-start">
                          <input className="input-field text-sm" aria-label="Site content key" defaultValue={c.key} onChange={(e) => setEditingSiteContent({ ...editingSiteContent, key: e.target.value })} />
                          <textarea className="input-field text-sm" rows={1} aria-label="Site content value" defaultValue={c.value} onChange={(e) => setEditingSiteContent({ ...editingSiteContent, value: e.target.value })} />
                          <input className="input-field text-sm" aria-label="Site content section" defaultValue={c.section ?? ''} onChange={(e) => setEditingSiteContent({ ...editingSiteContent, section: e.target.value })} />
                          <div className="flex gap-2">
                            <button onClick={() => updateSiteContent.mutate(editingSiteContent)} className="btn-primary text-sm px-4 py-2">Save</button>
                            <button onClick={() => setEditingSiteContent(null)} className="btn-outline text-sm px-4 py-2">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-mono text-sm font-semibold text-[var(--color-deepgray)] dark:text-white">{c.key}</p>
                              {c.section && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><FileCode className="w-3 h-3" /> {c.section}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">{c.value}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => updateSiteContent.mutate({ ...c, isActive: !c.isActive })}
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}
                            >
                              {c.isActive ? 'Active' : 'Hidden'}
                            </button>
                            <button onClick={() => setEditingSiteContent(c)} aria-label={`Edit site content: ${c.key}`} className="p-2 rounded-lg text-gray-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deleteSiteContent.mutate(c.id)} aria-label={`Delete site content: ${c.key}`} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {/* ============ SUPPORT ============ */}
        {activeTab === 'support' && (
          <Panel title={`Support Tickets (${tickets.length})`}>
            {ticketsLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : tickets.length === 0 ? (
              <EmptyState text="No support tickets yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      {['From', 'Subject', 'Priority', 'Status', 'Created', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[var(--color-deepgray)] dark:text-white">{t.user?.username}</p>
                          <p className="text-xs text-gray-500">{t.user?.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{t.subject}</p>
                          <p className="text-xs text-gray-500 line-clamp-1 max-w-[260px]">{t.message}</p>
                        </td>
                        <td className="px-6 py-4"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span></td>
                        <td className="px-6 py-4"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[t.status]}`}>{t.status}</span></td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap">
                            {['IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                              <button
                                key={s}
                                onClick={() => updateTicket.mutate({ id: t.id, status: s })}
                                disabled={t.status === s}
                                className={`text-xs font-semibold px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                                  t.status === s
                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                    : 'border-[var(--color-border)] text-gray-600 dark:text-gray-300 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                                }`}
                              >
                                {s.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* ============ CONTACT MESSAGES ============ */}
        {activeTab === 'messages' && (
          <Panel
            title={`Contact Form Messages (${platformMessages.length})`}
            action={<span className="text-xs font-semibold text-gray-500">{platformMessages.filter((m) => m.status === 'NEW').length} new</span>}
          >
            {messagesLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : platformMessages.length === 0 ? (
              <EmptyState text="No messages submitted through the contact form yet." />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {platformMessages.map((m) => (
                  <div key={m.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[var(--color-deepgray)] dark:text-white">{m.name}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          m.status === 'NEW' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          m.status === 'READ' ? 'bg-gray-100 dark:bg-white/10 text-gray-500' :
                          'bg-gray-100 dark:bg-white/10 text-gray-400'
                        }`}>{m.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {m.email} {m.phone && `· ${m.phone}`}</p>
                      {m.subject && <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">{m.subject}</p>}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{m.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(m.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.status !== 'READ' && (
                        <button onClick={() => updateMessage.mutate({ id: m.id, status: 'READ' })} aria-label="Mark as read" className="p-2 rounded-lg text-gray-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"><CheckCircle className="w-4 h-4" /></button>
                      )}
                      {m.status !== 'ARCHIVED' && (
                        <button onClick={() => updateMessage.mutate({ id: m.id, status: 'ARCHIVED' })} aria-label="Archive message" className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Archive className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* ============ SAAS ============ */}
        {activeTab === 'saas' && (
          <div className="space-y-8">
            <Panel title="SaaS Plans (Vajra subscriptions)" action={
              <span className="text-xs font-semibold text-gray-400">{saasPlans.length} plans</span>
            }>
              {saasPlansLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : saasPlans.length === 0 ? (
                <EmptyState text="No SaaS plans yet. Create one below." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Plan', 'Cycle', 'Price', 'Limits', 'Status', 'Action'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {saasPlans.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Diamond className="w-4 h-4 text-[var(--color-primary)]" />
                              <span className="font-semibold text-[var(--color-deepgray)] dark:text-white">{p.name}</span>
                              <span className="text-xs font-mono text-gray-400">({p.code})</span>
                            </div>
                            {p.description && <p className="text-xs text-gray-400 mt-0.5 max-w-[260px] truncate">{p.description}</p>}
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Monthly</td>
                          <td className="px-6 py-4 font-semibold">₹{p.monthlyPrice.toLocaleString('en-IN')}/mo</td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                            {p.maxGyms} gym{p.maxGyms > 1 ? 's' : ''}
                            {p.maxMembers ? `, ${p.maxMembers} members` : ''}
                            {p.maxTrainers ? `, ${p.maxTrainers} trainers` : ''}
                            {p.maxStaff ? `, ${p.maxStaff} staff` : ''}
                            {p.advancedReports ? ', reports' : ''}
                          </td>
                          <td className="px-6 py-4">
                            {p.isActive ? (
                              <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Active</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 text-xs font-bold px-2.5 py-1 rounded-full"><XCircle className="w-3 h-3" /> Inactive</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => togglePlan.mutate(p)} disabled={togglePlan.isPending} className="text-[var(--color-primary)] hover:underline font-semibold text-sm disabled:opacity-50">
                              {p.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Create SaaS Plan">
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} aria-label="Plan name" placeholder="Plan name" className="input-field py-2! text-sm" />
                  <input value={planForm.code} onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })} aria-label="Plan code" placeholder="Code (e.g. GROW)" className="input-field py-2! text-sm" />
                  <input type="number" value={planForm.monthlyPrice} onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: Number(e.target.value) })} aria-label="Plan price" placeholder="Price (₹/mo)" className="input-field py-2! text-sm" />
                  <div className="flex items-center text-sm text-gray-400 font-medium">Monthly billing</div>
                  <input type="number" min={1} value={planForm.maxGyms} onChange={(e) => setPlanForm({ ...planForm, maxGyms: Number(e.target.value) })} aria-label="Max gyms" placeholder="Max gyms" className="input-field py-2! text-sm" />
                  <input value={planForm.maxMembers} onChange={(e) => setPlanForm({ ...planForm, maxMembers: e.target.value })} aria-label="Max members" placeholder="Max members (blank = unlimited)" className="input-field py-2! text-sm" />
                  <input value={planForm.maxTrainers} onChange={(e) => setPlanForm({ ...planForm, maxTrainers: e.target.value })} aria-label="Max trainers" placeholder="Max trainers (blank = unlimited)" className="input-field py-2! text-sm" />
                  <input value={planForm.maxStaff} onChange={(e) => setPlanForm({ ...planForm, maxStaff: e.target.value })} aria-label="Max staff" placeholder="Max staff (blank = unlimited)" className="input-field py-2! text-sm" />
                  <input value={planForm.features} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })} aria-label="Plan features" placeholder="Features (comma separated)" className="input-field py-2! text-sm md:col-span-2" />
                  <input value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} aria-label="Plan description" placeholder="Description" className="input-field py-2! text-sm md:col-span-2" />
                </div>
                {createPlan.isError && <p className="text-red-500 text-sm mt-3">Failed to create plan. Check the backend is running and fields are valid.</p>}
                <button onClick={() => createPlan.mutate(planForm)} disabled={createPlan.isPending || !planForm.name || !planForm.code} className="mt-4 inline-flex items-center gap-2 bg-[var(--color-primary)] text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
                  <Plus className="w-4 h-4" /> {createPlan.isPending ? 'Creating…' : 'Create Plan'}
                </button>
              </div>
            </Panel>

            <Panel title={`Gym Subscriptions (${subscriptions.length})`}>
              {subsLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : subscriptions.length === 0 ? (
                <EmptyState text="No subscriptions yet. Assign a plan to a gym below." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Gym', 'Plan', 'Amount', 'Period', 'Status', 'Update'].map((h) => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {subscriptions.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-semibold text-[var(--color-deepgray)] dark:text-white">{s.gym.name}<div className="text-xs text-gray-400 font-normal">{s.gym.city}</div></td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{s.plan.name} <span className="text-xs text-gray-400">(₹{s.plan.monthlyPrice.toLocaleString('en-IN')}/mo)</span></td>
                          <td className="px-6 py-4 font-semibold">₹{s.amount.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{new Date(s.startDate).toLocaleDateString('en-IN')} → {new Date(s.endDate).toLocaleDateString('en-IN')}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${s.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : s.status === 'SUSPENDED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                              <CreditCard className="w-3 h-3" /> {s.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <select aria-label={`Update status for ${s.gym.name}`} value={s.status} onChange={(e) => updateSubStatus.mutate({ id: s.id, status: e.target.value })} disabled={updateSubStatus.isPending} className="input-field py-1.5! text-xs bg-white! dark:bg-[#1a1a1a]!">
                              {['ACTIVE', 'PENDING', 'SUSPENDED', 'EXPIRED', 'CANCELLED'].map((st) => <option key={st} value={st}>{st}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Assign Plan to Gym">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select aria-label="Select gym" value={subForm.gymId} onChange={(e) => setSubForm({ ...subForm, gymId: e.target.value })} className="input-field py-2! text-sm bg-white! dark:bg-[#1a1a1a]!">
                    <option value="">Select gym…</option>
                    {gyms.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.city})</option>)}
                  </select>
                  <select aria-label="Select plan" value={subForm.planId} onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })} className="input-field py-2! text-sm bg-white! dark:bg-[#1a1a1a]!">
                    <option value="">Select plan…</option>
                    {saasPlans.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name} — ₹{p.monthlyPrice.toLocaleString('en-IN')}/mo</option>)}
                  </select>
                  <input type="date" aria-label="Subscription start date" value={subForm.startDate} onChange={(e) => setSubForm({ ...subForm, startDate: e.target.value })} className="input-field py-2! text-sm" />
                </div>
                {createSubscription.isError && <p className="text-red-500 text-sm mt-3">Failed to create subscription. Select a gym and an active plan.</p>}
                <button onClick={() => createSubscription.mutate(subForm)} disabled={createSubscription.isPending || !subForm.gymId || !subForm.planId} className="mt-4 inline-flex items-center gap-2 bg-[var(--color-primary)] text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
                  <Plus className="w-4 h-4" /> {createSubscription.isPending ? 'Assigning…' : 'Start Subscription'}
                </button>
              </div>
            </Panel>
          </div>
        )}

        {/* ============ AUDIT ============ */}
        {activeTab === 'audit' && (
          <Panel title="Security & Activity Logs">
            {logsLoading ? <div className="p-8 text-center text-gray-400">Loading…</div> : logs.length === 0 ? (
              <EmptyState text="No audit events recorded yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      {['Action', 'Entity', 'Details', 'Performed By', 'When'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                            <FileText className="w-3 h-3" /> {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{log.entity}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-[300px] truncate">{log.details || log.entityId || '—'}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{log.user ? `${log.user.username} (${log.user.email})` : 'System'}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
