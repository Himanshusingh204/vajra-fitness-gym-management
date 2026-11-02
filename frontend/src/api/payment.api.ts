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
  status: 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED';
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

export interface Earnings {
  grossPaise: number;
  commissionPaise: number;
  commissionGstPaise: number;
  payablePaise: number;
  paidOrders: number;
  recentOrders: { id: string; status: string; totalPaise: number; gymNetPaise: number; paidAt: string | null; planSnapshot: { name: string } }[];
}

export const getOwnerEarnings = async () => {
  const response = await api.get<Earnings>('/owner/earnings');
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
