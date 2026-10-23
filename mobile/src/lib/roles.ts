import type { Me } from '../api/types';

export function trainerStatus(me: Me) {
  return me.trainerStatus ?? me.trainerDetails?.status ?? 'ACTIVE';
}

export function homePath(me: Me) {
  switch (me.role) {
    case 'MEMBER':
      return '/member';
    case 'TRAINER':
      return trainerStatus(me) === 'ACTIVE' ? '/trainer' : '/awaiting-approval';
    case 'GYM_ADMIN':
      return '/partner';
    case 'STAFF':
      return '/staff';
    default:
      return '/web-only';
  }
}

// The gym a staff, trainer or partner account works in. A partner who owns
// several gyms gets the first one; switching gyms is a web feature for now.
export function workGymId(me: Me): string | undefined {
  if (me.role === 'GYM_ADMIN') return me.ownedGyms[0]?.id;
  if (me.role === 'STAFF') return me.staffDetails?.gym.id;
  if (me.role === 'TRAINER') return me.trainerDetails?.gym.id;
  return undefined;
}

export const roleName: Record<Me['role'], string> = {
  MEMBER: 'Member',
  TRAINER: 'Trainer',
  GYM_ADMIN: 'Partner',
  STAFF: 'Staff',
  SUPER_ADMIN: 'Super admin',
};
