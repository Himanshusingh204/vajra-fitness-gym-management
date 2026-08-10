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

    const totalAmount = fees.reduce((sum, f) => sum + f.amount.toNumber(), 0);
    const paidFees = fees.filter((f) => f.status === 'PAID');
    const paidRevenue = paidFees.reduce((sum, f) => sum + f.amount.toNumber(), 0);
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

// Chart data for gym admin dashboard analytics.
export const gymAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Monthly revenue trend (last 6 months)
    const monthlyRevenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const monthFees = await prisma.fee.aggregate({
        _sum: { amount: true },
        where: { gymId, status: 'PAID', paymentDate: { gte: startOfMonth, lte: endOfMonth } }
      });

      const monthMemberships = await prisma.membership.aggregate({
        _sum: { finalAmount: true },
        where: { gymId, status: 'ACTIVE', startDate: { gte: startOfMonth, lte: endOfMonth } }
      });

      monthlyRevenueTrend.push({
        month: startOfMonth.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        fees: monthFees._sum.amount?.toNumber() ?? 0,
        memberships: monthMemberships._sum.finalAmount?.toNumber() ?? 0,
        total: (monthFees._sum.amount?.toNumber() ?? 0) + (monthMemberships._sum.finalAmount?.toNumber() ?? 0)
      });
    }

    // Membership plan distribution
    const planDistribution = await prisma.membershipPlan.findMany({
      where: { gymId, isActive: true },
      include: {
        _count: { select: { memberships: { where: { status: 'ACTIVE' } } } }
      }
    });

    // Member growth trend (last 6 months)
    const memberGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const count = await prisma.memberDetails.count({
        where: { gymId, createdAt: { lte: endOfMonth } }
      });
      memberGrowth.push({
        month: endOfMonth.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        totalMembers: count
      });
    }

    // Attendance trend (last 30 days)
    const attendanceTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      const count = await prisma.attendance.count({
        where: { gymId, checkIn: { gte: startOfDay, lte: endOfDay } }
      });
      attendanceTrend.push({
        date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        checkIns: count
      });
    }

    // Peak hours heatmap (last 30 days)
    const peakHours = await prisma.attendance.groupBy({
      by: ['checkIn'],
      where: { gymId, checkIn: { gte: thirtyDaysAgo } }
    });

    const heatmapData: { day: number; hour: number; value: number }[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmapData.push({ day, hour, value: 0 });
      }
    }

    peakHours.forEach((record) => {
      const date = new Date(record.checkIn);
      const day = date.getDay();
      const hour = date.getHours();
      const index = day * 24 + hour;
      if (heatmapData[index]) {
        heatmapData[index].value += 1;
      }
    });

    // Payment status breakdown
    const paymentStatus = await prisma.fee.groupBy({
      by: ['status'],
      where: { gymId, paymentDate: { gte: thirtyDaysAgo } },
      _count: true,
      _sum: { amount: true }
    });

    // Revenue by payment method
    const paymentMethods = await prisma.fee.groupBy({
      by: ['paymentMethod'],
      where: { gymId, status: 'PAID', paymentDate: { gte: thirtyDaysAgo } },
      _count: true,
      _sum: { amount: true }
    });

    // Member status breakdown
    const memberStatus = await prisma.memberDetails.groupBy({
      by: ['status'],
      where: { gymId },
      _count: true
    });

    // Top members by attendance
    const topMembers = await prisma.attendance.groupBy({
      by: ['memberId'],
      where: { gymId, checkIn: { gte: thirtyDaysAgo }, memberId: { not: null } },
      _count: true,
      orderBy: { _count: { memberId: 'desc' } },
      take: 10
    });

    const topMemberDetails = await Promise.all(
      topMembers.map(async (m) => {
        const member = await prisma.memberDetails.findUnique({
          where: { id: m.memberId! },
          include: { user: { select: { username: true, email: true } } }
        });
        return { ...m, member };
      })
    );

    // Expiring memberships
    const expiringSoon = await prisma.membership.findMany({
      where: {
        gymId,
        status: 'ACTIVE',
        endDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
      },
      include: { member: { include: { user: { select: { username: true, email: true } } } }, plan: true },
      orderBy: { endDate: 'asc' },
      take: 10
    });

    // Overdue fees
    const overdueFees = await prisma.fee.findMany({
      where: { gymId, status: 'OVERDUE' },
      include: { member: { include: { user: { select: { username: true, email: true } } } } },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    res.json({
      monthlyRevenueTrend,
      planDistribution: planDistribution.map(p => ({
        name: p.name,
        members: p._count.memberships,
        price: p.price.toNumber()
      })),
      memberGrowth,
      attendanceTrend,
      heatmapData,
      paymentStatus: paymentStatus.map(p => ({
        status: p.status,
        count: p._count,
        amount: p._sum.amount?.toNumber() ?? 0
      })),
      paymentMethods: paymentMethods.map(p => ({
        method: p.paymentMethod || 'CASH',
        count: p._count,
        amount: p._sum.amount?.toNumber() ?? 0
      })),
      memberStatus: memberStatus.map(m => ({
        status: m.status,
        count: m._count
      })),
      topMembers: topMemberDetails.filter(m => m.member).map(m => ({
        name: m.member!.user.username,
        email: m.member!.user.email,
        checkIns: m._count
      })),
      expiringSoon: expiringSoon.map(m => ({
        member: m.member.user.username,
        email: m.member.user.email,
        plan: m.plan?.name,
        endDate: m.endDate.toISOString().slice(0, 10),
        daysLeft: Math.ceil((new Date(m.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      })),
      overdueFees: overdueFees.map(f => ({
        member: f.member.user.username,
        email: f.member.user.email,
        amount: f.amount.toNumber(),
        dueDate: f.dueDate.toISOString().slice(0, 10)
      }))
    });
  } catch (error) {
    console.error('Gym analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
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
      monthRevenue: monthRevenue._sum.amount?.toNumber() ?? 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
