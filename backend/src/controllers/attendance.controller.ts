import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';

const startOfDay = (d: Date) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (d: Date) => {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
};

// Returns true when the authenticated user is the gym owner or staff at this gym.
const isGymStaff = async (userId: string | undefined, gymId: string) => {
  if (!userId) return false;
  const staff = await prisma.staffDetails.findFirst({ where: { userId, gymId } });
  return !!staff;
};

// Get attendance for a gym (today by default, or by date) with search + pagination
export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { date, search, status, branchId } = req.query;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10) || 50));

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const isOwner = gym.ownerId === req.user?.userId;
    const isStaff = await isGymStaff(req.user?.userId, gymId);
    if (!isOwner && !isStaff && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: String(branchId), gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to this gym' });
    }

    let dateFilter: any = {};
    if (date) {
      const targetDate = new Date(date as string);
      if (!Number.isNaN(targetDate.getTime())) {
        dateFilter = { checkIn: { gte: startOfDay(targetDate), lte: endOfDay(targetDate) } };
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

    const member = await prisma.memberDetails.findFirst({ where: { userId } });
    if (!member) return res.status(404).json({ error: 'Member profile not found' });

    const records = await prisma.attendance.findMany({
      where: { memberId: member.id },
      include: { gym: { select: { name: true } } },
      orderBy: { checkIn: 'desc' },
    });

    res.json({ memberId: member.id, total: records.length, records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// Mark attendance (manual check-in) — Gym Admin or Staff at that gym
export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { memberId, staffId } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const isOwner = gym.ownerId === req.user?.userId;
    const isStaff = await isGymStaff(req.user?.userId, gymId);
    if (!isOwner && !isStaff && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let branchId: string | null = null;

    if (memberId) {
      const member = await prisma.memberDetails.findUnique({ where: { id: memberId } });
      if (!member || member.gymId !== gymId) {
        return res.status(400).json({ error: 'Member does not belong to this gym' });
      }
      branchId = member.branchId;

      // Duplicate check-in prevention: one record per member per day per gym.
      const todayStart = startOfDay(new Date());
      const existing = await prisma.attendance.findFirst({
        where: { gymId, memberId, checkIn: { gte: todayStart } },
      });
      if (existing) {
        return res.status(409).json({ error: 'Member already checked in today', attendance: existing });
      }
    }

    if (staffId) {
      const staff = await prisma.staffDetails.findUnique({ where: { id: staffId } });
      if (!staff || staff.gymId !== gymId) {
        return res.status(400).json({ error: 'Staff member does not belong to this gym' });
      }
      branchId = staff.branchId;

      const todayStart = startOfDay(new Date());
      const existing = await prisma.attendance.findFirst({
        where: { gymId, staffId, checkIn: { gte: todayStart } },
      });
      if (existing) {
        return res.status(409).json({ error: 'Staff member already checked in today', attendance: existing });
      }
    }

    if (!memberId && !staffId) {
      return res.status(400).json({ error: 'Provide either memberId or staffId' });
    }

    const attendance = await prisma.attendance.create({
      data: {
        gymId,
        memberId: memberId || null,
        staffId: staffId || null,
        branchId,
        checkIn: new Date(),
        status: 'PRESENT',
      },
    });
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};
