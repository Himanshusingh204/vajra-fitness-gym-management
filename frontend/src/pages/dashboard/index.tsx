import { useAuthStore } from '../../store/useAuthStore';
import MemberArea from '../member';
import StaffArea from '../staff';
import TrainerArea from '../trainer';

export default function DashboardArea() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'TRAINER') return <TrainerArea />;
  if (role === 'STAFF') return <StaffArea />;
  return <MemberArea />;
}
