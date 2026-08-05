import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';
import { createNotification } from '../services/notification.service';

export const DAY_MS = 24 * 60 * 60 * 1000;

// Public & Super Admin: list active SaaS plans
export const getSaaSPlans = async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.all === 'true';
    const plans = await prisma.saaSPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { price: 'asc' },
    });
    res.json(plans);
  } catch {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

// Super Admin: create a SaaS plan
export const createSaaSPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description, price, billingCycle, maxGyms, maxMembers, maxTrainers, maxStaff, advancedReports, features, isActive } = req.body;

    const plan = await prisma.saaSPlan.create({
      data: {
        name,
        code,
        description: description ?? null,
        price,
        billingCycle: billingCycle || 'MONTHLY',
        maxGyms: maxGyms ?? 1,
        maxMembers: maxMembers ?? null,
        maxTrainers: maxTrainers ?? null,
        maxStaff: maxStaff ?? null,
        advancedReports: advancedReports ?? false,
        features: JSON.stringify(features ?? []),
        isActive: isActive ?? true,
      },
    });

    await logAudit({
      action: 'SAAS_PLAN_CREATED',
      entity: 'SaaSPlan',
      entityId: plan.id,
      details: JSON.stringify({ name, price, billingCycle }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(plan);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'A plan with this name or code already exists' });
    }
    res.status(500).json({ error: 'Failed to create plan' });
  }
};

// Super Admin: update a SaaS plan
export const updateSaaSPlan = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, code, description, price, billingCycle, maxGyms, maxMembers, maxTrainers, maxStaff, advancedReports, features, isActive } = req.body;

    const plan = await prisma.saaSPlan.findUnique({ where: { id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const updated = await prisma.saaSPlan.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(billingCycle !== undefined ? { billingCycle } : {}),
        ...(maxGyms !== undefined ? { maxGyms } : {}),
        ...(maxMembers !== undefined ? { maxMembers } : {}),
        ...(maxTrainers !== undefined ? { maxTrainers } : {}),
        ...(maxStaff !== undefined ? { maxStaff } : {}),
        ...(advancedReports !== undefined ? { advancedReports } : {}),
        ...(features !== undefined ? { features: JSON.stringify(features) } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    await logAudit({
      action: 'SAAS_PLAN_UPDATED',
      entity: 'SaaSPlan',
      entityId: id,
      details: JSON.stringify({ name, price }),
      userId: req.user?.userId ?? null,
    });

    res.json(updated);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'A plan with this name or code already exists' });
    }
    res.status(500).json({ error: 'Failed to update plan' });
  }
};

// Super Admin: delete a SaaS plan (soft: deactivate)
export const deleteSaaSPlan = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const plan = await prisma.saaSPlan.findUnique({ where: { id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    await prisma.saaSPlan.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Plan deactivated' });
  } catch {
    res.status(500).json({ error: 'Failed to deactivate plan' });
  }
};

// Super Admin: list gym subscriptions
export const getSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    const { status, gymId } = req.query as { status?: string; gymId?: string };
    const subscriptions = await prisma.gymSubscription.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(gymId ? { gymId } : {}),
      },
      include: {
        gym: { select: { id: true, name: true, city: true, ownerId: true } },
        plan: { select: { id: true, name: true, code: true, price: true, billingCycle: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subscriptions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
};

// Super Admin: create a subscription for a gym
export const createSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { gymId, planId, startDate } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    const plan = await prisma.saaSPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const start = startDate ? new Date(startDate) : new Date();
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid start date' });

    const cyclesPerYear = plan.billingCycle === 'YEARLY' ? 1 : 12;
    const months = plan.billingCycle === 'YEARLY' ? 12 : 1;
    const end = new Date(start.getTime());
    end.setMonth(end.getMonth() + months);

    const subscription = await prisma.gymSubscription.create({
      data: {
        gymId,
        planId,
        status: 'ACTIVE',
        startDate: start,
        endDate: end,
        amount: plan.price * cyclesPerYear,
      },
      include: { plan: { select: { name: true } }, gym: { select: { name: true } } },
    });

    await createNotification({
      userId: gym.ownerId,
      type: 'SUCCESS',
      title: 'Subscription activated',
      message: `Your ${plan.name} subscription is active.`,
      link: '/admin/gym',
    });

    await logAudit({
      action: 'SUBSCRIPTION_CREATED',
      entity: 'GymSubscription',
      entityId: subscription.id,
      details: JSON.stringify({ gymId, planId, amount: subscription.amount }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(subscription);
  } catch {
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

// Super Admin: update subscription status
export const updateSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body as { status: string };

    if (!['ACTIVE', 'PENDING', 'EXPIRED', 'SUSPENDED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid subscription status' });
    }

    const subscription = await prisma.gymSubscription.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });

    const updated = await prisma.gymSubscription.update({ where: { id }, data: { status } });

    await createNotification({
      userId: subscription.gym.ownerId,
      type: status === 'ACTIVE' ? 'SUCCESS' : status === 'SUSPENDED' ? 'WARNING' : 'INFO',
      title: 'Subscription updated',
      message: `Your gym subscription is now ${status}.`,
      link: '/admin/gym',
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

// Gym Admin: view their own active subscription
export const getMyGymSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const gym = await prisma.gym.findFirst({ where: { ownerId: userId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const subscription = await prisma.gymSubscription.findFirst({
      where: { gymId: gym.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { id: true, name: true, code: true, price: true, billingCycle: true, features: true, maxGyms: true, maxMembers: true, maxTrainers: true, maxStaff: true, advancedReports: true } } },
    });

    res.json({ gymId: gym.id, subscription });
  } catch {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};
