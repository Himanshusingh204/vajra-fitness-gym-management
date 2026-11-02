import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// The gym a member is looking at when they belong to more than one.
// null means "let the backend pick", which is their default gym.
interface GymStore {
  gymId: string | null;
  setGymId: (gymId: string | null) => void;
}

export const useGymStore = create<GymStore>()(
  persist(
    (set) => ({
      gymId: null,
      setGymId: (gymId) => set({ gymId }),
    }),
    { name: 'vf-member-gym' }
  )
);
