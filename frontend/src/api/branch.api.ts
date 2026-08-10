import api from '../services/api';

export interface GymBranch {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { members: number; trainers: number; staff: number; classes: number };
}

export const getBranches = async (gymId: string): Promise<GymBranch[]> => {
  const response = await api.get(`/branches/gym/${gymId}`);
  return response.data;
};

export const createBranch = async (
  gymId: string,
  data: { name: string; address: string; city: string; state: string; phone?: string },
) => {
  const response = await api.post(`/branches/gym/${gymId}`, data);
  return response.data;
};

export const updateBranch = async (id: string, data: Partial<GymBranch>) => {
  const response = await api.put(`/branches/${id}`, data);
  return response.data;
};

export const deleteBranch = async (id: string) => {
  const response = await api.delete(`/branches/${id}`);
  return response.data;
};
