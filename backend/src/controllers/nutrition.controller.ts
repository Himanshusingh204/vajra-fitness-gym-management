import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';

export const getMyNutrition = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const plans = await prisma.nutritionPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(plans);
  } catch {
    res.status(500).json({ error: 'Failed to fetch nutrition plans' });
  }
};

export const createNutritionPlan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { title, calories, meals } = req.body;
    const plan = await prisma.nutritionPlan.create({
      data: { userId, title, calories: calories || null, meals: meals || '[]' },
    });
    res.status(201).json(plan);
  } catch {
    res.status(500).json({ error: 'Failed to create nutrition plan' });
  }
};

export const updateNutritionPlan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id as string;
    const plan = await prisma.nutritionPlan.findFirst({ where: { id, userId } });
    if (!plan) return res.status(404).json({ error: 'Nutrition plan not found' });

    const { title, calories, meals } = req.body;
    const updated = await prisma.nutritionPlan.update({
      where: { id },
      data: { title, calories: calories ?? plan.calories, meals: meals ?? plan.meals },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update nutrition plan' });
  }
};

export const deleteNutritionPlan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id as string;
    const plan = await prisma.nutritionPlan.findFirst({ where: { id, userId } });
    if (!plan) return res.status(404).json({ error: 'Nutrition plan not found' });
    await prisma.nutritionPlan.delete({ where: { id } });
    res.json({ message: 'Nutrition plan deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete nutrition plan' });
  }
};