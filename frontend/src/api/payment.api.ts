import api from '../services/api';

export interface PaymentConfig {
  enabled: boolean;
  keyId: string | null;
}

export interface CheckoutResponse {
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  feeId: string;
}

export const getPaymentConfig = async () => {
  const response = await api.get<PaymentConfig>('/payments/config');
  return response.data;
};

export const createCheckout = async (feeId: string) => {
  const response = await api.post<CheckoutResponse>('/payments/checkout', { feeId });
  return response.data;
};

export interface PlanOrder {
  id: string;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
}

// One key per click: a retry of the same request returns the same order.
export const createPlanOrder = async (gymId: string, planId: string, idempotencyKey: string) => {
  const response = await api.post<PlanOrder>('/orders', { gymId, planId }, { headers: { 'Idempotency-Key': idempotencyKey } });
  return response.data;
};

// Checkout success handler for a plan order; the webhook settles it too if this never arrives.
export const verifyPlanOrder = async (params: { orderId: string; paymentId: string; signature: string }) => {
  const response = await api.post<{ id: string; status: string; membershipId: string | null }>('/orders/verify', params);
  return response.data;
};

export interface LedgerRow {
  id: string;
  account: string;
  amountPaise: number;
  sourceType: string;
  sourceId: string;
  createdAt: string;
  gym: { name: string };
}

export interface RefundRow {
  id: string;
  amountPaise: number;
  reason: string | null;
  status: string;
  createdAt: string;
  order: { id: string; totalPaise: number; planSnapshot: { name: string }; gym: { id: string; name: string }; memberUser: { username: string; email: string } };
}

export interface PayoutRow {
  id: string;
  amountPaise: number;
  status: string;
  razorpayTransferId: string | null;
  failureReason: string | null;
  createdAt: string;
  gym: { id: string; name: string };
}

export interface Earnings {
  grossPaise: number;
  commissionPaise: number;
  commissionGstPaise: number;
  payablePaise: number;
  balancePaise: number;
  availablePaise: number;
  minPayoutPaise: number;
  paidOrders: number;
  recentOrders: { id: string; status: string; totalPaise: number; gymNetPaise: number; paidAt: string | null; planSnapshot: { name: string } }[];
  ledger: LedgerRow[];
  refunds: RefundRow[];
  payouts: PayoutRow[];
}

export const getOwnerEarnings = async () => {
  const response = await api.get<Earnings>('/owner/earnings');
  return response.data;
};

export interface MyOrder {
  id: string;
  status: string;
  totalPaise: number;
  paidAt: string | null;
  createdAt: string;
  planSnapshot: { name: string };
  gym: { id: string; name: string };
  refunds: { id: string; status: string; amountPaise: number }[];
}

export const getMyOrders = async () => {
  const response = await api.get<MyOrder[]>('/orders/mine');
  return response.data;
};

export const requestRefund = async (orderId: string, reason: string) => {
  const response = await api.post(`/orders/${orderId}/refund-request`, reason ? { reason } : {});
  return response.data;
};

export const decideRefund = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
  const response = await api.post<RefundRow>(`/refunds/${id}/decide`, { decision });
  return response.data;
};

export const verifyPayment = async (params: { orderId: string; paymentId: string; signature: string }) => {
  const response = await api.post('/payments/verify', params);
  return response.data;
};

// Loads the Razorpay checkout script once; resolves as soon as it's available.
let scriptPromise: Promise<void> | null = null;
export const loadRazorpayScript = () => {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Failed to load payment gateway. Please try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
};
