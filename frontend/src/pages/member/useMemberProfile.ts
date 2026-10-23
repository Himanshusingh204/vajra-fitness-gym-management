import { useQuery } from '@tanstack/react-query';
import { getMyProfile } from '../../api/member.api';

export function useMemberProfile() {
  return useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
    refetchInterval: 30000,
    retry: false, // a missing profile means the member has not joined a gym yet
  });
}
