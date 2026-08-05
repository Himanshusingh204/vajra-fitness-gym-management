import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit } from '../utils/audit';
import { prisma } from '../utils/prisma';

// Get active plans for a gym (public)
export const getPlans = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const plans = await prisma.membershipPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { price: 'asc' }
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch membership plans' });
  }
};

// Get all plans including inactive (Gym Admin of that gym or Super Admin)
export const getAllPlans = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const plans = await prisma.membershipPlan.findMany({
      where: { gymId },
      orderBy: { price: 'asc' }
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch membership plans' });
  }
};

// Create a new plan (Gym Admin only)
export const createPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, duration, price, gymId } = req.body;
    
    // Verify ownership
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || gym.ownerId !== req.user?.userId) {
      return res.status(403).json({ error: 'Unauthorized to add plans to this gym' });
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        name,
        description,
        duration,
        price,
        gymId
      }
    });

    await logAudit({
      action: 'PLAN_CREATED',
      entity: 'MembershipPlan',
      entityId: plan.id,
      details: JSON.stringify({ name, price }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create membership plan' });
  }
};

// Update a plan
export const updatePlan = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description, duration, price, isActive } = req.body;

    const plan = await prisma.membershipPlan.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (req.user?.role !== 'SUPER_ADMIN' && plan.gym.ownerId !== req.user?.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedPlan = await prisma.membershipPlan.update({
      where: { id },
      data: { name, description, duration, price, isActive }
    });
    res.json(updatedPlan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
};

// Delete a plan
export const deletePlan = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const plan = await prisma.membershipPlan.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (req.user?.role !== 'SUPER_ADMIN' && plan.gym.ownerId !== req.user?.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.membershipPlan.delete({ where: { id } });
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plan' });
  }
};
