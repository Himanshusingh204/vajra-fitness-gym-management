import api from '../services/api';

export interface Payslip {
  id: string;
  month: number;
  year: number;
  basicSalary: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  status: string;
  paymentMethod?: string | null;
  transactionId?: string | null;
  paidDate?: string | null;
  notes?: string | null;
  createdAt: string;
  user: { id: string; username: string; email: string };
}

export interface PayslipSummary {
  year: number;
  totalPaid: number;
  totalPending: number;
  totalPayslips: number;
  monthlyTotals: Array<{
    month: number;
    total: number;
    count: number;
  }>;
}

export const getPayslips = async (gymId: string, params?: { month?: number; year?: number; status?: string; userId?: string }) => {
  const response = await api.get<Payslip[]>(`/payslips/gym/${gymId}`, { params });
  return response.data;
};

export const createPayslip = async (gymId: string, data: {
  userId: string;
  month: number;
  year: number;
  basicSalary: number;
  bonuses?: number;
  deductions?: number;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}) => {
  const response = await api.post<Payslip>(`/payslips/gym/${gymId}`, data);
  return response.data;
};

export const updatePayslipStatus = async (id: string, data: { status: string; paymentMethod?: string; transactionId?: string }) => {
  const response = await api.put<Payslip>(`/payslips/${id}`, data);
  return response.data;
};

export const deletePayslip = async (id: string) => {
  const response = await api.delete(`/payslips/${id}`);
  return response.data;
};

export const getPayslipSummary = async (gymId: string, year?: number) => {
  const response = await api.get<PayslipSummary>(`/payslips/gym/${gymId}/summary`, { params: { year } });
  return response.data;
};
