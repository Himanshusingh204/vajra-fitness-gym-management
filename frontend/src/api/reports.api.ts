import api from '../services/api';

export interface GymAnalytics {
  monthlyRevenueTrend: {
    month: string;
    fees: number;
    memberships: number;
    total: number;
  }[];
  planDistribution: {
    name: string;
    members: number;
    price: number;
  }[];
  memberGrowth: {
    month: string;
    totalMembers: number;
  }[];
  attendanceTrend: {
    date: string;
    checkIns: number;
  }[];
  heatmapData: {
    day: number;
    hour: number;
    value: number;
  }[];
  paymentStatus: {
    status: string;
    count: number;
    amount: number;
  }[];
  paymentMethods: {
    method: string;
    count: number;
    amount: number;
  }[];
  memberStatus: {
    status: string;
    count: number;
  }[];
  topMembers: {
    name: string;
    email: string;
    checkIns: number;
  }[];
  expiringSoon: {
    member: string;
    email: string;
    plan: string;
    endDate: string;
    daysLeft: number;
  }[];
  overdueFees: {
    member: string;
    email: string;
    amount: number;
    dueDate: string;
  }[];
}

export const getGymAnalytics = (gymId: string): Promise<GymAnalytics> =>
  api.get(`/reports/gym/${gymId}/analytics`).then((r) => r.data);

export const getGymStats = (gymId: string): Promise<any> =>
  api.get(`/reports/gym/${gymId}/stats`).then((r) => r.data);

export const getRevenueReport = (gymId: string, params?: { from?: string; to?: string }): Promise<any> =>
  api.get(`/reports/gym/${gymId}/revenue`, { params }).then((r) => r.data);