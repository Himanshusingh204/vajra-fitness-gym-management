import api from '../services/api';

export interface GymPlan {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  isActive: boolean;
}

export interface Gym {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  location?: string | null;
  gstNumber?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  facilities?: string | null;
  isApproved: boolean;
  membershipPlans: GymPlan[];
}

export const getPublicGyms = async (): Promise<Gym[]> => {
  const response = await api.get('/gym');
  return response.data;
};

export const enrollMember = async (gymId: string, planId?: string, preferredPaymentMethod?: string) => {
  const response = await api.post('/members/enroll', {
    gymId,
    planId,
    ...(preferredPaymentMethod ? { preferredPaymentMethod } : {}),
  });
  return response.data;
};
