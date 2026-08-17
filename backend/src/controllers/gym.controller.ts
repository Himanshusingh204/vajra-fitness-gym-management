import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { getOrSetJSON } from '../utils/cache';

export const listPublicGyms = async (_req: Request, res: Response) => {
  try {
    const gyms = await prisma.gym.findMany({
      where: { isApproved: true },
      include: {
        membershipPlans: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(gyms);
  } catch {
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
};

export const getMyGym = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const gym = await prisma.gym.findFirst({ where: { ownerId: userId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    res.json(gym);
  } catch {
    res.status(500).json({ error: 'Failed to fetch gym' });
  }
};

export const updateGym = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { name, address, city, state, location, gstNumber, logoUrl, imageUrl, facilities, brandColor, tagline, subdomain, customDomain } = req.body;
    const gym = await prisma.gym.findFirst({ where: { ownerId: userId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const updated = await prisma.gym.update({
      where: { id: gym.id },
      data: {
        name,
        address,
        city,
        state,
        location,
        gstNumber,
        logoUrl,
        imageUrl,
        facilities,
        brandColor,
        tagline,
        ...(subdomain !== undefined ? { subdomain: subdomain || null } : {}),
        ...(customDomain !== undefined ? { customDomain: customDomain || null } : {}),
      },
    });

    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const field = err?.meta?.target?.includes('customDomain') ? 'custom domain' : 'subdomain';
      return res.status(409).json({ error: `That ${field} is already taken by another gym` });
    }
    res.status(500).json({ error: 'Failed to update gym' });
  }
};

// Subdomain availability check (Gym Admin / Super Admin)
export const checkSubdomain = async (req: AuthRequest, res: Response) => {
  try {
    const subdomain = String(req.query.subdomain || '').trim().toLowerCase();
    if (!subdomain) return res.status(400).json({ error: 'subdomain query parameter is required' });

    const gym = await prisma.gym.findFirst({ where: { subdomain } });
    const currentUserId = req.user?.userId;
    // Own subdomain is "available" so the owner can re-save their own settings.
    const available = !gym || gym.ownerId === currentUserId;
    res.json({ available, subdomain });
  } catch {
    res.status(500).json({ error: 'Failed to check subdomain' });
  }
};

// Dashboard stats for a gym (owner or Super Admin)
export const getGymStats = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    if (req.user?.role !== 'SUPER_ADMIN' && gym.ownerId !== req.user?.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Frontend polls this every 30s and tolerates that much staleness —
    // cache for a fraction of the poll interval so repeat polls hit Redis
    // instead of re-running 11 queries against a remote DB.
    const stats = await getOrSetJSON(`gym-stats:${gymId}`, 15, async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [totalMembers, activeMembers, pendingMembers, trainers, staff, totalFeesPaid, monthFeesPaid, pendingFees, attendanceToday, plans, notices] = await Promise.all([
        prisma.memberDetails.count({ where: { gymId } }),
        prisma.memberDetails.count({ where: { gymId, status: 'ACTIVE' } }),
        prisma.memberDetails.count({ where: { gymId, status: 'PENDING' } }),
        prisma.trainerDetails.count({ where: { gymId } }),
        prisma.staffDetails.count({ where: { gymId } }),
        prisma.fee.aggregate({ _sum: { amount: true }, where: { gymId, status: 'PAID' } }),
        prisma.fee.aggregate({ _sum: { amount: true }, where: { gymId, status: 'PAID', paymentDate: { gte: monthStart } } }),
        prisma.fee.count({ where: { gymId, status: { in: ['PENDING', 'OVERDUE'] } } }),
        prisma.attendance.count({ where: { gymId, checkIn: { gte: todayStart, lt: todayEnd } } }),
        prisma.membershipPlan.count({ where: { gymId } }),
        prisma.notice.count({ where: { gymId } }),
      ]);

      return {
        totalMembers,
        activeMembers,
        pendingMembers,
        trainers,
        staff,
        totalRevenue: totalFeesPaid._sum.amount ?? 0,
        revenueThisMonth: monthFeesPaid._sum.amount ?? 0,
        pendingFees,
        attendanceToday,
        plans,
        notices,
      };
    });

    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Failed to fetch gym stats' });
  }
};
