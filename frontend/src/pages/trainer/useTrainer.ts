import { useQuery } from '@tanstack/react-query';
import { getMe } from '../../api/auth.api';
import { getTrainerBookings } from '../../api/booking.api';
import { getGymMembers } from '../../api/member.api';

export function useTrainerMe() {
  return useQuery({ queryKey: ['me'], queryFn: getMe });
}

// Only runs once the trainer is approved. A 403 with TRAINER_PENDING or TRAINER_REJECTED
// still lands in `error` if the status changed since /auth/me was read.
export function useTrainerBookings(enabled: boolean) {
  return useQuery({ queryKey: ['trainerBookings'], queryFn: getTrainerBookings, enabled, retry: false });
}

export function useGymMembers(gymId?: string) {
  return useQuery({
    queryKey: ['gymMembers', gymId],
    queryFn: () => getGymMembers(gymId as string),
    enabled: !!gymId,
  });
}

export function blockedCode(error: unknown): 'PENDING' | 'REJECTED' | null {
  const code = (error as { response?: { data?: { code?: string } } } | null)?.response?.data?.code;
  if (code === 'TRAINER_PENDING') return 'PENDING';
  if (code === 'TRAINER_REJECTED') return 'REJECTED';
  return null;
}
