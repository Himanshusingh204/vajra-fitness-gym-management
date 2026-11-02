import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { canAccessGym } from '../utils/tenant';
import { getOrSetJSON, dropCached } from '../utils/cache';
import { logAudit } from '../utils/audit';
import { startOfDayIn } from '../utils/time';
import { findDuplicateGym } from '../utils/duplicateGym';
import { protectedChanges, submitGymChange } from '../services/approval.service';

const num = z.coerce.number();
const listQuery = z
  .object({
    q: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    category: z.string().trim().max(60).optional(),
    facility: z.string().trim().max(60).optional(),
    minPrice: num.min(0).optional(),
    maxPrice: num.min(0).optional(),
    lat: num.min(-90).max(90).optional(),
    lng: num.min(-180).max(180).optional(),
    radiusKm: num.positive().max(500).default(25),
    sort: z.enum(['relevance', 'price', 'distance', 'newest']).default('relevance'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    paged: z.enum(['1']).optional(),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), { message: 'lat and lng go together' });

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
};

export const listPublicGyms = async (req: Request, res: Response) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const f = parsed.data;
  try {
    // Without ?paged=1 the plain array is returned, which older callers (mobile picker) expect.
    // shortcut: price, text match and sorting run in memory after the SQL filters; move to SQL past a few thousand approved gyms.
    const key = `gyms:public:${JSON.stringify(f, Object.keys(f).sort())}`;
    const result = await getOrSetJSON(key, 60, async () => {
      const geo = f.lat !== undefined && f.lng !== undefined;
      const where: Prisma.GymWhereInput = { status: 'APPROVED' };
      if (f.city) where.city = { equals: f.city, mode: 'insensitive' };
      if (f.category) where.category = { equals: f.category, mode: 'insensitive' };
      if (f.facility) where.facilities = { has: f.facility };
      if (geo) {
        const dLat = f.radiusKm / 111;
        const dLng = f.radiusKm / (111 * Math.max(Math.cos((f.lat! * Math.PI) / 180), 0.01));
        where.lat = { gte: f.lat! - dLat, lte: f.lat! + dLat };
        where.lng = { gte: f.lng! - dLng, lte: f.lng! + dLng };
      }

      // Public endpoint: an explicit allow-list so owner ids, GSTIN and domain
      // settings never leave the server.
      const rows = await prisma.gym.findMany({
        where,
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          location: true,
          logoUrl: true,
          imageUrl: true,
          facilities: true,
          tagline: true,
          brandColor: true,
          isApproved: true,
          category: true,
          lat: true,
          lng: true,
          createdAt: true,
          membershipPlans: {
            where: { isActive: true },
            orderBy: { price: 'asc' },
            select: { id: true, name: true, description: true, duration: true, price: true, isActive: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const q = f.q?.toLowerCase();
      const priceOf = (g: (typeof rows)[number]) => (g.membershipPlans[0] ? Number(g.membershipPlans[0].price) : null);
      const rank = (name: string) => (!q ? 0 : name.toLowerCase().startsWith(q) ? 0 : name.toLowerCase().includes(q) ? 1 : 2);

      let list = rows
        .map((g) => ({
          ...g,
          distanceKm: geo && g.lat !== null && g.lng !== null ? Math.round(haversineKm(f.lat!, f.lng!, g.lat, g.lng) * 10) / 10 : null,
        }))
        .filter((g) => {
          if (q && ![g.name, g.city, g.location ?? '', ...g.facilities].some((t) => t.toLowerCase().includes(q))) return false;
          const price = priceOf(g);
          if (f.minPrice !== undefined && (price === null || price < f.minPrice)) return false;
          if (f.maxPrice !== undefined && (price === null || price > f.maxPrice)) return false;
          return !geo || (g.distanceKm !== null && g.distanceKm <= f.radiusKm);
        });

      if (f.sort === 'price') list.sort((a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity));
      else if (f.sort === 'distance' && geo) list.sort((a, b) => a.distanceKm! - b.distanceKm!);
      else if (f.sort === 'newest') list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      else if (q) list.sort((a, b) => rank(a.name) - rank(b.name));

      const slim = list.map(({ lat, lng, createdAt, ...g }) => g);
      const start = (f.page - 1) * f.limit;
      return f.paged ? { items: slim.slice(start, start + f.limit), total: slim.length, page: f.page } : slim;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
};

export const listGymCities = async (_req: Request, res: Response) => {
  try {
    const cities = await getOrSetJSON('gyms:public:cities', 300, async () => {
      const rows = await prisma.gym.findMany({ where: { status: 'APPROVED' }, distinct: ['city'], select: { city: true }, orderBy: { city: 'asc' } });
      return rows.map((r) => r.city).filter(Boolean);
    });
    res.json(cities);
  } catch {
    res.status(500).json({ error: 'Failed to fetch cities' });
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
    const {
      name, address, city, state, location, gstNumber, logoUrl, imageUrl, facilities, brandColor, tagline, subdomain, customDomain,
      description, openingHours, phone, email, galleryUrls,
    } = req.body;
    const gym = await prisma.gym.findFirst({ where: { ownerId: userId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    // Identity fields are never saved here; they go to the admin as a change request.
    const changes = protectedChanges(gym, { name, address, city, state, gstNumber, phone, email });
    if (Object.keys(changes).length) {
      const duplicate = await findDuplicateGym({ ...gym, ...changes }, gym.id);
      if (duplicate) return res.status(409).json({ error: duplicate.message, code: 'DUPLICATE_GYM' });
    }
    const changeRequest = Object.keys(changes).length ? await submitGymChange(gym, changes, userId) : null;

    const updated = await prisma.gym.update({
      where: { id: gym.id },
      data: {
        location,
        logoUrl,
        imageUrl,
        facilities,
        brandColor,
        tagline,
        description,
        openingHours,
        galleryUrls,
        ...(subdomain !== undefined ? { subdomain: subdomain || null } : {}),
        ...(customDomain !== undefined ? { customDomain: customDomain || null } : {}),
      },
    });

    await dropCached(
      `public-gym:${gym.id}`,
      ...[gym.subdomain, updated.subdomain].filter((s): s is string => !!s).map((s) => `public-gym:site:${s}`),
    );
    await logAudit({
      action: 'GYM_PROFILE_UPDATED',
      entity: 'Gym',
      entityId: gym.id,
      details: JSON.stringify({ fields: Object.keys(req.body) }),
      userId,
      ipAddress: req.ip ?? null,
    });

    res.json({ ...updated, changeRequest });
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

    if (!(await canAccessGym(req.user, gym.id))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Frontend polls this every 30s and tolerates that much staleness —
    // cache for a fraction of the poll interval so repeat polls hit Redis
    // instead of re-running 11 queries against a remote DB.
    const stats = await getOrSetJSON(`gym-stats:${gymId}`, 15, async () => {
      const todayStart = startOfDayIn(new Date());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

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

// The owner's own change requests, newest first.
export const getMyChangeRequests = async (req: AuthRequest, res: Response) => {
  const gym = await prisma.gym.findFirst({ where: { ownerId: req.user!.userId }, select: { id: true } });
  if (!gym) return res.status(404).json({ error: 'Gym not found' });
  const requests = await prisma.approvalRequest.findMany({
    where: { gymId: gym.id, type: 'GYM_PROFILE_CHANGE' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json(requests);
};
