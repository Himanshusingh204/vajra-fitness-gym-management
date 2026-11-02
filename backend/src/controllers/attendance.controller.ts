import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { startOfDayIn, endOfDayIn } from '../utils/time';
import { canAccessGym, findMemberProfile, requestedGymId } from '../utils/tenant';

// Inserts today's check-in unless that member or staff member already has one,
// in which case the existing row comes back with which id matched.
const checkInOnce = (gymId: string, who: { memberId?: string; staffId?: string }, branchId: string | null) =>
  prisma.$transaction(async (tx) => {
    // Serialises check-ins per gym so a double tap can't insert two rows for the same day.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`check-in:${gymId}`}))`;
    const since = startOfDayIn(new Date());
    for (const key of ['memberId', 'staffId'] as const) {
      if (!who[key]) continue;
      const existing = await tx.attendance.findFirst({ where: { gymId, [key]: who[key], checkIn: { gte: since } } });
      if (existing) return { existing, duplicate: key };
    }
    const attendance = await tx.attendance.create({
      data: { gymId, memberId: who.memberId ?? null, staffId: who.staffId ?? null, branchId, checkIn: new Date(), status: 'PRESENT' },
    });
    return { attendance };
  });

// Get attendance for a gym (today by default, or by date) with search + pagination
export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { date, search, status, branchId } = req.query;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10) || 50));

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (!(await canAccessGym(req.user, gymId, ['STAFF']))) return res.status(403).json({ error: 'Unauthorized' });

    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: String(branchId), gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to this gym' });
    }

    let dateFilter: any = {};
    if (date) {
      const targetDate = new Date(date as string);
      if (!Number.isNaN(targetDate.getTime())) {
        dateFilter = { checkIn: { gte: startOfDayIn(targetDate), lte: endOfDayIn(targetDate) } };
      }
    }

    let searchFilter: any = {};
    if (search) {
      searchFilter = {
        OR: [
          { member: { user: { username: { contains: search as string } } } },
          { staff: { user: { username: { contains: search as string } } } },
        ],
      };
    }

    let statusFilter: any = {};
    if (status) statusFilter = { status };

    const where: any = { gymId, ...dateFilter, ...searchFilter, ...statusFilter };
    if (branchId) where.branchId = branchId;

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          member: { include: { user: { select: { username: true } } } },
          staff: { include: { user: { select: { username: true } } } },
        },
        orderBy: { checkIn: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.attendance.count({ where }),
    ]);

    res.json({ records, total, page, pageSize });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// Member self-service: fetch own attendance history
export const getMyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const member = await findMemberProfile(userId, requestedGymId(req));
    if (!member) return res.status(404).json({ error: 'Member profile not found' });

    const records = await prisma.attendance.findMany({
      where: { memberId: member.id },
      include: { gym: { select: { name: true } } },
      orderBy: { checkIn: 'desc' },
      take: 500,
    });

    res.json({ memberId: member.id, total: records.length, records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// Member self check-in: same one-per-day rule as manual marking, plus an active membership.
export const selfCheckIn = async (req: AuthRequest, res: Response) => {
  try {
    const member = await findMemberProfile(req.user!.userId, requestedGymId(req));
    if (!member) return res.status(404).json({ error: 'Member profile not found' });

    const now = new Date();
    const active = await prisma.membership.findFirst({
      where: { memberId: member.id, status: 'ACTIVE', startDate: { lte: now }, endDate: { gte: now } },
      select: { id: true },
    });
    if (member.status !== 'ACTIVE' || !active) {
      return res.status(403).json({ error: 'An active membership is required to check in' });
    }

    const result = await checkInOnce(member.gymId, { memberId: member.id }, member.branchId);
    if (result.existing) return res.status(409).json({ error: 'You already checked in today', attendance: result.existing });
    res.status(201).json(result.attendance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check in' });
  }
};

// Mark attendance (manual check-in) — Gym Admin or Staff at that gym
export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { memberId, staffId } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (!(await canAccessGym(req.user, gymId, ['STAFF']))) return res.status(403).json({ error: 'Unauthorized' });

    let branchId: string | null = null;

    if (memberId) {
      const member = await prisma.memberDetails.findUnique({ where: { id: memberId } });
      if (!member || member.gymId !== gymId) {
        return res.status(400).json({ error: 'Member does not belong to this gym' });
      }
      branchId = member.branchId;
    }

    if (staffId) {
      const staff = await prisma.staffDetails.findUnique({ where: { id: staffId } });
      if (!staff || staff.gymId !== gymId) {
        return res.status(400).json({ error: 'Staff member does not belong to this gym' });
      }
      branchId = staff.branchId;
    }

    if (!memberId && !staffId) {
      return res.status(400).json({ error: 'Provide either memberId or staffId' });
    }

    const result = await checkInOnce(gymId, { memberId, staffId }, branchId);
    if (result.existing) {
      const who = result.duplicate === 'memberId' ? 'Member' : 'Staff member';
      return res.status(409).json({ error: `${who} already checked in today`, attendance: result.existing });
    }
    res.status(201).json(result.attendance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};
