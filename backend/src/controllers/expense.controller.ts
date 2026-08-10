import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';
import { assertGymCapacity } from '../services/entitlements.service';

// List expenses for a gym
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { category, from, to } = req.query as { category?: string; from?: string; to?: string };

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const where: any = { gymId };
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0);
    res.json({ expenses, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

// Record an expense
export const recordExpense = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { category, description, amount, date, isRecurring, receiptUrl, notes } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const expense = await prisma.expense.create({
      data: {
        gymId,
        category,
        description,
        amount,
        date: date ? new Date(date) : new Date(),
        isRecurring: isRecurring ?? false,
        receiptUrl: receiptUrl ?? null,
        notes: notes ?? null,
      },
    });

    await logAudit({
      action: 'EXPENSE_RECORDED',
      entity: 'Expense',
      entityId: expense.id,
      details: JSON.stringify({ category, amount }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record expense' });
  }
};

// Delete an expense
export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    if (expense.gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.expense.delete({ where: { id } });
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// Expense summary
export const getExpenseSummary = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [monthExpenses, totalExpenses, byCategory] = await Promise.all([
      prisma.expense.aggregate({ where: { gymId, date: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { gymId }, _sum: { amount: true } }),
      prisma.expense.groupBy({
        by: ['category'],
        where: { gymId, date: { gte: monthStart } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    res.json({
      monthTotal: monthExpenses._sum.amount ?? 0,
      allTimeTotal: totalExpenses._sum.amount ?? 0,
      byCategory,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
};
