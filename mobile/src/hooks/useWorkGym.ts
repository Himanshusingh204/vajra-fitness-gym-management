import { workGymId } from '../lib/roles';
import { useUser } from '../providers/AuthProvider';

export function useWorkGym() {
  const user = useUser();
  return workGymId(user);
}
