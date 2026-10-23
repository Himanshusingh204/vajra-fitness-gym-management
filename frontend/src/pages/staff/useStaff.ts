import { useQuery } from '@tanstack/react-query';
import { getMe } from '../../api/auth.api';
import { getGymMembers } from '../../api/member.api';

export function useStaffGym() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  return { gymId: me?.staffDetails?.gym?.id as string | undefined, gymName: me?.staffDetails?.gym?.name as string | undefined };
}

export function useGymMembers(gymId?: string) {
  return useQuery({
    queryKey: ['gymMembers', gymId],
    queryFn: () => getGymMembers(gymId as string),
    enabled: !!gymId,
  });
}

export const matchesSearch = (m: any, search: string) => {
  const q = search.toLowerCase();
  return m.user?.username?.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q);
};
