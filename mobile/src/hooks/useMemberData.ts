import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/errors';
import { isKnownGym } from '../lib/gymChoice';
import { getMemberGymId, setMemberGymId } from '../api/session';
import { getMemberFees, getMemberWorkouts, getMyAttendance, getMyGyms, getMyMemberships, getMyProfile } from '../api/gym';

// A member with no gym yet gets a 404 from /members/my-profile, which is a
// normal state rather than an error.
export function useMemberProfile() {
  return useQuery({
    queryKey: ['member', 'profile'],
    queryFn: async () => {
      try {
        // A saved gym the member has since left falls back to their default gym.
        const saved = getMemberGymId();
        if (saved && !isKnownGym(saved, await getMyGyms())) setMemberGymId(null);
        return await getMyProfile();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  });
}

export function useMyMemberships(enabled: boolean) {
  return useQuery({ queryKey: ['member', 'memberships'], queryFn: getMyMemberships, enabled });
}

export function useMyFees(memberId: string | undefined) {
  return useQuery({
    queryKey: ['member', 'fees', memberId],
    queryFn: () => getMemberFees(memberId!),
    enabled: !!memberId,
  });
}

export function useMyWorkouts(memberId: string | undefined) {
  return useQuery({
    queryKey: ['member', 'workouts', memberId],
    queryFn: () => getMemberWorkouts(memberId!),
    enabled: !!memberId,
  });
}

export function useMyAttendance(enabled: boolean) {
  return useQuery({ queryKey: ['member', 'attendance'], queryFn: getMyAttendance, enabled });
}

export function useMyGyms() {
  return useQuery({ queryKey: ['member', 'gyms'], queryFn: getMyGyms });
}

export function useSwitchGym() {
  const queryClient = useQueryClient();
  return (gymId: string) => {
    setMemberGymId(gymId);
    // Everything else under 'member' belongs to one gym; the gym list itself stays.
    queryClient.resetQueries({ queryKey: ['member'], predicate: (q) => q.queryKey[1] !== 'gyms' });
  };
}
