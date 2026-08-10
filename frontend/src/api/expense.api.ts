import api from '../services/api';

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  isRecurring: boolean;
  receiptUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export const getExpenses = async (gymId: string, params?: { category?: string; from?: string; to?: string }) => {
  const response = await api.get<{ expenses: Expense[]; total: number }>(`/expenses/gym/${gymId}`, { params });
  return response.data;
};

export const recordExpense = async (gymId: string, data: {
  category: string;
  description: string;
  amount: number;
  date?: string;
  isRecurring?: boolean;
  receiptUrl?: string;
  notes?: string;
}) => {
  const response = await api.post<Expense>(`/expenses/gym/${gymId}`, data);
  return response.data;
};

export const deleteExpense = async (id: string) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};

export const getExpenseSummary = async (gymId: string) => {
  const response = await api.get(`/expenses/gym/${gymId}/summary`);
  return response.data;
};
