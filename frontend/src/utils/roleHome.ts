import type { Role } from '../store/useAuthStore';

export function homeForRole(role: Role) {
  if (role === 'SUPER_ADMIN') return '/admin/super';
  if (role === 'GYM_ADMIN') return '/admin/gym';
  return '/dashboard';
}
