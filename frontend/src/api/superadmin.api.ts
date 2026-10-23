import { isAxiosError } from 'axios';
import api from '../services/api';

export type Analytics = {
  totalGyms: number;
  activeGyms: number;
  pendingGyms: number;
  totalMembers: number;
  pendingMembers: number;
  totalStaff: number;
  totalTrainers: number;
  activeMembers: number;
  platformRevenue: number;
  mrr: number;
  arr: number;
  arpu: number;
  cltv: number | null;
  churnRate: number;
  churnedCount: number;
  newSubscriptionsThisMonth: number;
  trialConversionRate: number;
  failedPayments: number;
  revenueByPlan: Record<string, number>;
  gymsByStatus: Record<string, number>;
  monthlyRevenueTrend: Array<{ month: string; total: number }>;
  topGyms: Array<{ id: string; name: string; city: string; memberCount: number; plan: string; subscriptionStatus: string }>;
};

export type AdminGym = {
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

export type AdminUser = {
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

export type Faq = { id: string; question: string; answer: string; category: string | null; isActive: boolean };

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  content: string;
  gymName: string | null;
  rating: number;
  featured: boolean;
  isActive: boolean;
};

export type SiteContent = { id: string; key: string; value: string; section: string | null; isActive: boolean };

export type Ticket = {
  id: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  createdAt: string;
  user?: { username: string; email: string } | null;
};

export type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user?: { username: string; email: string } | null;
};

export type AdminPlan = {
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

export type AdminSub = {
  id: string;
  status: string;
  amount: number;
  startDate: string;
  endDate: string;
  gym: { id: string; name: string; city: string };
  plan: { id: string; name: string; code: string; monthlyPrice: number };
};

export type PlatformMessage = {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  createdAt: string;
};

export type PlatformFee = {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  member?: { user?: { username: string } | null } | null;
  gym?: { name: string } | null;
};

export const getAnalytics = () => api.get<Analytics>('/admin/analytics').then((r) => r.data);
export const getAdminGyms = () => api.get<AdminGym[]>('/admin/gyms').then((r) => r.data);
export const getAdminUsers = () => api.get<AdminUser[]>('/admin/users').then((r) => r.data);
export const getFaqs = () => api.get<Faq[]>('/admin/cms/faqs').then((r) => r.data);
export const getTestimonials = () => api.get<Testimonial[]>('/admin/cms/testimonials').then((r) => r.data);
export const getSiteContent = () => api.get<SiteContent[]>('/admin/cms/site-content').then((r) => r.data);
export const getTickets = () => api.get<Ticket[]>('/admin/support/tickets').then((r) => r.data);
export const getPlatformMessages = () => api.get<PlatformMessage[]>('/admin/messages').then((r) => r.data);
export const getAuditLogs = () => api.get<AuditLog[]>('/admin/audit-logs').then((r) => r.data);
export const getPlatformFees = () => api.get<PlatformFee[]>('/admin/fees').then((r) => r.data);
export const getAdminPlans = () => api.get<AdminPlan[]>('/saas/plans', { params: { all: 'true' } }).then((r) => r.data);
export const getAdminSubs = () => api.get<AdminSub[]>('/saas/subscriptions').then((r) => r.data);

export const errorMessage = (err: unknown, fallback: string) =>
  (isAxiosError<{ error?: string }>(err) && err.response?.data?.error) || fallback;

export const dateIN = (value: string) => new Date(value).toLocaleDateString('en-IN');
export const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`;
