import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../api/errors';
import { getMemberFees, getMemberWorkouts, getMyAttendance, getMyMemberships, getMyProfile } from '../api/gym';

// A member with no gym yet gets a 404 from /members/my-profile, which is a
// normal state rather than an error.
export function useMemberProfile() {
  return useQuery({
    queryKey: ['member', 'profile'],
    queryFn: async () => {
      try {
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
