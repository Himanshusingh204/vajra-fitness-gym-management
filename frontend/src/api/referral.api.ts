import api from '../services/api';

export interface Referral {
  id: string;
  referralCode: string;
  rewardType: string;
  rewardValue: number;
  status: string;
  createdAt: string;
}

export interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalRewardValue: number;
}

export const getReferrals = async (gymId: string) => {
  const response = await api.get<Referral[]>(`/referrals/gym/${gymId}`);
  return response.data;
};

export const createReferral = async (gymId: string, data: {
  userId: string;
  referredUserId: string;
  rewardType: string;
  rewardValue: number;
}) => {
  const response = await api.post<Referral>(`/referrals/gym/${gymId}`, data);
  return response.data;
};

export const updateReferralStatus = async (id: string, status: string) => {
  const response = await api.put<Referral>(`/referrals/${id}`, { status });
  return response.data;
};

export const getReferralStats = async (gymId: string) => {
  const response = await api.get<ReferralStats>(`/referrals/gym/${gymId}/stats`);
  return response.data;
};
