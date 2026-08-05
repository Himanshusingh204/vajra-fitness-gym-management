import api from '../services/api';

export interface Membership {
  id: string;
  startDate: string;
  endDate: string;
  originalAmount: number;
  discount: number;
  finalAmount: number;
  paymentStatus: string;
  status: string;
  lifecycleStatus: string;
  paymentMethod?: string | null;
  transactionId?: string | null;
  isRenewal: boolean;
  createdAt: string;
  plan?: { id: string; name: string; duration: number; price: number } | null;
  previousMembership?: Membership | null;
}

export const getMyMemberships = async () => {
  const response = await api.get<Membership[]>('/memberships/my');
  return response.data;
};

export const getMyAttendance = async () => {
  const response = await api.get('/attendance/my');
  return response.data;
};
