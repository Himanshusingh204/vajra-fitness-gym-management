import api from '../services/api';

export interface ProgressLog {
  id: string;
  weight: number;
  height?: number | null;
  bodyFat?: number | null;
  bmi?: number | null;
  date: string;
}

export interface ProgressSummary {
  logs: ProgressLog[];
  latest: ProgressLog | null;
  bmi: number | null;
  weightChange: number | null;
  entries: number;
}

export const getMyProgress = async () => {
  const response = await api.get<ProgressSummary>('/progress/my');
  return response.data;
};

export const createProgressLog = async (data: {
  weight: number;
  height?: number | null;
  bodyFat?: number | null;
}) => {
  const response = await api.post<ProgressLog>('/progress', data);
  return response.data;
};

export const getMemberProgress = async (memberId: string) => {
  const response = await api.get<ProgressSummary>(`/progress/member/${memberId}`);
  return response.data;
};
