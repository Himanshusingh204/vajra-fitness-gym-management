import { createContext, useContext } from 'react';
import type { GymBranch } from '../../api/branch.api';

export type GymInfo = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  imageUrl?: string;
  facilities?: string;
};

export type ConfirmRequest = { title: string; message: string; confirmLabel?: string; onConfirm: () => void };

export type GymState = {
  gym: GymInfo;
  branches: GymBranch[];
  branchesLoading: boolean;
  approvedBranches: GymBranch[];
  branchFilter: string;
  setBranchFilter: (id: string) => void;
  confirm: (request: ConfirmRequest | null) => void;
};

export const GymContext = createContext<GymState | null>(null);

export function useGym() {
  const value = useContext(GymContext);
  if (!value) throw new Error('useGym must be used inside the gym admin area');
  return value;
}
