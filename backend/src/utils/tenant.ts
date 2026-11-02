import type { Request } from 'express';
import { prisma } from './prisma';
import type { AuthRequest } from '../middlewares/auth.middleware';

// The one tenant check for gym-scoped routes: the gym's owner, a SUPER_ADMIN,
// and staff or trainers who work at that gym when the route lets them in.
export const canAccessGym = async (
  user: AuthRequest['user'],
  gymId: string,
  alsoAllow: Array<'STAFF' | 'TRAINER'> = [],
): Promise<boolean> => {
  if (!user) return false;
  const { userId } = user;
  // A missing gym is refused for everyone, SUPER_ADMIN included.
  const ownerFilter = user.role === 'SUPER_ADMIN' ? {} : { ownerId: userId };
  if (await prisma.gym.count({ where: { id: gymId, ...ownerFilter } })) return true;
  if (alsoAllow.includes('STAFF') && (await prisma.staffDetails.count({ where: { userId, gymId } }))) return true;
  if (alsoAllow.includes('TRAINER') && (await prisma.trainerDetails.count({ where: { userId, gymId, status: 'ACTIVE' } }))) return true;
  return false;
};

// A member can belong to several gyms. Member-facing endpoints take the gym
// from ?gymId= or an X-Gym-Id header.
export const requestedGymId = (req: Request): string | undefined => {
  const fromQuery = req.query.gymId;
  if (typeof fromQuery === 'string' && fromQuery) return fromQuery;
  return req.get('x-gym-id') || undefined;
};

// The member row a request is about. Without a gym, it's the gym of the most
// recent active membership (then the newest row), so clients built for one
// gym per member keep working unchanged.
export const findMemberProfile = async (userId: string, gymId?: string) => {
  if (gymId) return prisma.memberDetails.findUnique({ where: { userId_gymId: { userId, gymId } } });

  const latest = await prisma.membership.findFirst({
    where: { member: { userId }, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
    select: { memberId: true },
  });
  if (latest) return prisma.memberDetails.findUnique({ where: { id: latest.memberId } });
  return prisma.memberDetails.findFirst({ where: { userId }, orderBy: { joiningDate: 'desc' } });
};
