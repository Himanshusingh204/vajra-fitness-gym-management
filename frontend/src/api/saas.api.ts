import api from '../services/api';

export interface SaaSPlan {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  monthlyPrice: number;
  quarterlyPrice: number;
  halfYearlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxGyms: number;
  maxMembers?: number | null;
  maxTrainers?: number | null;
  maxStaff?: number | null;
  maxBranches: number;
  maxClasses?: number | null;
  maxStorageMB?: number | null;
  advancedReports: boolean;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface GymSubscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  amount: number;
  billingCycle: string;
  paymentMethod?: string | null;
  trialEndsAt?: string | null;
  gracePeriodEnd?: string | null;
  autoRenew: boolean;
  plan?: { id: string; name: string; code: string; monthlyPrice: number } | null;
}

export interface SubscriptionSummary {
  hasSubscription: boolean;
  subscriptionId?: string;
  status: string;
  plan?: { id: string; name: string; code: string } | null;
  features: string[];
  limits: {
    maxMembers: number | null;
    maxTrainers: number | null;
    maxStaff: number | null;
    maxBranches: number;
    maxClasses: number | null;
  };
  usage: {
    members: number;
    trainers: number;
    staff: number;
    branches: number;
    classes: number;
  };
  startDate?: string;
  endDate?: string;
  isReadonly: boolean;
}

export interface SaaSInvoice {
  id: string;
  invoiceNumber: string;
  gymName: string;
  ownerName: string;
  billingAddress?: string | null;
  gstin?: string | null;
  planName: string;
  billingPeriod: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  discount: number;
  total: number;
  status: string;
  paymentMethod?: string | null;
  transactionId?: string | null;
  issueDate: string;
  dueDate: string;
  paidAt?: string | null;
}

export const getSaaSPlans = async () => {
  const response = await api.get<SaaSPlan[]>('/saas/plans');
  return response.data;
};

export const getMyGymSubscription = async () => {
  const response = await api.get<SubscriptionSummary>('/saas/my-subscription');
  return response.data;
};

export const purchaseSubscription = async (data: {
  planId: string;
  billingCycle?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  paymentMethod?: string;
}) => {
  const response = await api.post<GymSubscription>('/saas/purchase', data);
  return response.data;
};

export type SaaSSubscriptionCheckout =
  | { mode: 'online'; keyId: string; orderId: string; amount: number; currency: string; subscription: GymSubscription }
  | { mode: 'manual'; subscription: GymSubscription };

export const checkoutSubscription = async (data: {
  planId: string;
  billingCycle?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  paymentMethod?: string;
  gymId?: string;
}) => {
  const response = await api.post<SaaSSubscriptionCheckout>('/saas/checkout', data);
  return response.data;
};

export const verifySubscriptionPayment = async (params: { orderId: string; paymentId: string; signature: string }) => {
  const response = await api.post('/saas/verify', params);
  return response.data;
};

export const startTrial = async (data: { planId: string; trialDays?: number }) => {
  const response = await api.post<GymSubscription>('/saas/trial', data);
  return response.data;
};

export const upgradePlan = async (data: { planId: string }) => {
  const response = await api.post<GymSubscription>('/saas/upgrade', data);
  return response.data;
};

export const downgradePlan = async (data: { planId: string }) => {
  const response = await api.post<GymSubscription>('/saas/downgrade', data);
  return response.data;
};

export const getInvoices = async () => {
  const response = await api.get<SaaSInvoice[]>('/saas/invoices');
  return response.data;
};

export interface AdminSubscription {
  id: string;
  status: string;
  amount: number;
  gymId: string;
  planId: string;
  gym?: { id: string; name: string; city: string; ownerId: string };
  plan?: { id: string; name: string; code: string; monthlyPrice: number };
}

export const getAllSubscriptions = async () => {
  const response = await api.get<AdminSubscription[]>('/saas/subscriptions');
  return response.data;
};

export const extendSubscription = async (id: string, days: number) => {
  const response = await api.post(`/saas/subscriptions/${id}/extend`, { days });
  return response.data;
};

export const cancelSubscription = async (id: string, reason: string) => {
  const response = await api.post(`/saas/subscriptions/${id}/cancel`, { reason });
  return response.data;
};
