import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';

// =====================================================================
// PAYSLIP CONTROLLER (Staff & Trainer Payroll)
// Routes: payslip.routes.ts
// Responsibilities: list/create/update/delete payslips for a gym,
// monthly payroll summary, and employee self-view of own payslips.
// Tenant safety: every handler verifies the caller owns (or is a Super
// Admin of) the gym before reading or writing any payroll record.
// =====================================================================

// Helper: verify the requesting user owns the gym (or is SUPER_ADMIN).
const assertGymOwner = async (gymId: string, userId: string | undefined, role: string | undefined) => {
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true, ownerId: true } });
  if (!gym) return false;
  if (role === 'SUPER_ADMIN') return true;
  return gym.ownerId === userId;
};

// Helper: resolve the payslip's gym and verify ownership by id.
const assertPayslipGymAccess = async (payslipId: string, userId: string | undefined, role: string | undefined) => {
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    select: { id: true, gymId: true },
  });
  if (!payslip) return { ok: false as const, payslip: null };
  const ok = await assertGymOwner(payslip.gymId, userId, role);
  return { ok, payslip };
};

// GET /api/payslips/gym/:gymId — list payslips for a gym (owner / super admin).
export const getPayslips = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { month, year, status, userId } = req.query as { month?: string; year?: string; status?: string; userId?: string };

    // Tenant isolation: verify the caller owns this gym.
    if (!(await assertGymOwner(gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const where: any = { gymId };
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const payslips = await prisma.payslip.findMany({
      where,
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(payslips);
  } catch (error) {
    console.error('Get payslips error:', error);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
};

// POST /api/payslips/gym/:gymId — create a payslip for an employee (owner / super admin).
export const createPayslip = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { userId, month, year, basicSalary, bonuses, deductions, paymentMethod, notes } = req.body;

    if (!userId || !month || !year || basicSalary === undefined) {
      return res.status(400).json({ error: 'userId, month, year, and basicSalary are required' });
    }

    // Tenant isolation: verify the caller owns this gym.
    if (!(await assertGymOwner(gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify the employee actually belongs to this gym (staff or trainer).
    const [staff, trainer] = await Promise.all([
      prisma.staffDetails.findFirst({ where: { userId, gymId }, select: { id: true } }),
      prisma.trainerDetails.findFirst({ where: { userId, gymId }, select: { id: true } }),
    ]);
    if (!staff && !trainer) {
      return res.status(400).json({ error: 'User is not staff or a trainer of this gym' });
    }

    const netPay = basicSalary + (bonuses || 0) - (deductions || 0);

    const payslip = await prisma.payslip.create({
      data: {
        gymId,
        userId,
        month: parseInt(month),
        year: parseInt(year),
        basicSalary,
        bonuses: bonuses || 0,
        deductions: deductions || 0,
        netPay,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      },
      include: { user: { select: { id: true, username: true, email: true } } },
    });

    await logAudit({
      action: 'PAYSLIP_CREATED',
      entity: 'Payslip',
      entityId: payslip.id,
      details: JSON.stringify({ gymId, userId, month, year, netPay }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(payslip);
  } catch (error) {
    console.error('Create payslip error:', error);
    res.status(500).json({ error: 'Failed to create payslip' });
  }
};

// PUT /api/payslips/:id — update payslip status (owner / super admin).
export const updatePayslipStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, paymentMethod } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Tenant isolation: verify the caller owns the payslip's gym.
    const access = await assertPayslipGymAccess(id, req.user?.userId, req.user?.role);
    if (!access.ok) return res.status(403).json({ error: 'Unauthorized' });

    // NOTE: the Prisma field is `paidAt` (see schema.prisma Payslip model).
    const data: any = { status };
    if (paymentMethod) data.paymentMethod = paymentMethod;
    if (status === 'PAID') data.paidAt = new Date();

    const payslip = await prisma.payslip.update({
      where: { id },
      data,
      include: { user: { select: { id: true, username: true, email: true } } },
    });

    await logAudit({
      action: 'PAYSLIP_STATUS_UPDATED',
      entity: 'Payslip',
      entityId: id,
      details: JSON.stringify({ status, gymId: access.payslip?.gymId }),
      userId: req.user?.userId ?? null,
    });

    res.json(payslip);
  } catch (error) {
    console.error('Update payslip error:', error);
    res.status(500).json({ error: 'Failed to update payslip' });
  }
};

// DELETE /api/payslips/:id — delete a payslip (owner / super admin).
export const deletePayslip = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Tenant isolation: verify the caller owns the payslip's gym.
    const access = await assertPayslipGymAccess(id, req.user?.userId, req.user?.role);
    if (!access.ok) return res.status(403).json({ error: 'Unauthorized' });

    await prisma.payslip.delete({ where: { id } });

    await logAudit({
      action: 'PAYSLIP_DELETED',
      entity: 'Payslip',
      entityId: id,
      details: JSON.stringify({ gymId: access.payslip?.gymId }),
      userId: req.user?.userId ?? null,
    });

    res.json({ message: 'Payslip deleted' });
  } catch (error) {
    console.error('Delete payslip error:', error);
    res.status(500).json({ error: 'Failed to delete payslip' });
  }
};

// GET /api/payslips/gym/:gymId/summary — monthly payroll summary (owner / super admin).
export const getPayslipSummary = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { year } = req.query as { year?: string };

    // Tenant isolation: verify the caller owns this gym.
    if (!(await assertGymOwner(gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const payslips = await prisma.payslip.findMany({
      where: { gymId, year: targetYear },
    });

    const totalPaid = payslips
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.netPay.toNumber(), 0);

    const totalPending = payslips
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.netPay.toNumber(), 0);

    const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
      const monthPayslips = payslips.filter((p) => p.month === i + 1);
      return {
        month: i + 1,
        total: monthPayslips.reduce((sum, p) => sum + p.netPay.toNumber(), 0),
        count: monthPayslips.length,
      };
    });

    res.json({
      year: targetYear,
      totalPaid,
      totalPending,
      totalPayslips: payslips.length,
      monthlyTotals,
    });
  } catch (error) {
    console.error('Get payslip summary error:', error);
    res.status(500).json({ error: 'Failed to fetch payslip summary' });
  }
};

// GET /api/payslips/my — employee self-view of their own payslips (staff/trainer/member-adjacent users).
export const getMyPayslips = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });

    const payslips = await prisma.payslip.findMany({
      where: { userId: req.user.userId },
      include: { gym: { select: { id: true, name: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(payslips);
  } catch (error) {
    console.error('Get my payslips error:', error);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
};
