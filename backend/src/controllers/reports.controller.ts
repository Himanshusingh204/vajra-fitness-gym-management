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

const today = () => new Date();

// Revenue report for a gym with optional date range & CSV export.
export const revenueReport = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { from, to, format } = req.query as { from?: string; to?: string; format?: string };

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const fromDate = from ? startOfDay(new Date(from)) : new Date(today().getFullYear(), today().getMonth(), 1);
    const toDate = to ? endOfDay(new Date(to)) : endOfDay(today());

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    const [fees, membershipCount, activeMemberCount, feeCountByStatus] = await Promise.all([
      prisma.fee.findMany({
        where: { gymId, paymentDate: { gte: fromDate, lte: toDate } },
        include: { member: { include: { user: { select: { username: true } } } } },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.membership.count({ where: { gymId } }),
      prisma.memberDetails.count({ where: { gymId, status: 'ACTIVE' } }),
      prisma.fee.groupBy({
        by: ['status'],
        where: { gymId, paymentDate: { gte: fromDate, lte: toDate } },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);
    const paidFees = fees.filter((f) => f.status === 'PAID');
    const paidRevenue = paidFees.reduce((sum, f) => sum + f.amount, 0);
    const outstanding = totalAmount - paidRevenue;

    const report = {
      gymId,
      gymName: gym.name,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      summary: {
        totalRecords: fees.length,
        totalAmount,
        paidRevenue,
        outstanding,
        paidCount: paidFees.length,
        activeMembers: activeMemberCount,
        totalMemberships: membershipCount,
        byStatus: feeCountByStatus,
      },
      daily: fees,
    };

    if (format === 'csv') {
      const escapeCsv = (v: unknown) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ['Date', 'Receipt', 'Member', 'Amount', 'Status', 'Method', 'Transaction'];
      const rows = fees.map((f) =>
        [
          new Date(f.paymentDate).toISOString().slice(0, 10),
          f.id.slice(0, 8),
          f.member.user.username,
          f.amount,
          f.status,
          f.paymentMethod ?? '',
          f.transactionId ?? '',
        ]
          .map(escapeCsv)
          .join(',')
      );
      const csv = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="revenue-${gymId.slice(0, 8)}.csv"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(`\uFEFF${csv}`);
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

// High-level stats for a gym dashboard.
export const gymStats = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const monthStart = new Date(today().getFullYear(), today().getMonth(), 1);
    const dayStart = startOfDay(today());

    const [members, activeMembers, trainers, staff, todayCheckIns, pendingBookings, monthRevenue, pendingMembers, expiringMemberships] =
      await Promise.all([
        prisma.memberDetails.count({ where: { gymId } }),
        prisma.memberDetails.count({ where: { gymId, status: 'ACTIVE' } }),
        prisma.trainerDetails.count({ where: { gymId } }),
        prisma.staffDetails.count({ where: { gymId } }),
        prisma.attendance.count({ where: { gymId, checkIn: { gte: dayStart } } }),
        prisma.booking.count({ where: { gymId, status: 'PENDING' } }),
        prisma.fee.aggregate({
          where: { gymId, status: 'PAID', paymentDate: { gte: monthStart } },
          _sum: { amount: true },
        }),
        prisma.memberDetails.count({ where: { gymId, status: 'PENDING' } }),
        prisma.membership.count({
          where: { gymId, status: 'ACTIVE', endDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
        }),
      ]);

    res.json({
      members,
      activeMembers,
      trainers,
      staff,
      todayCheckIns,
      pendingBookings,
      pendingMembers,
      expiringMemberships,
      monthRevenue: monthRevenue._sum.amount ?? 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
