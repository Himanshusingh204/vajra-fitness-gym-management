import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';
import { createNotification } from '../services/notification.service';
import {
  createSaaSOrder,
  verifySaaSOrder,
  onlinePaymentsEnabled,
  PaymentDisabledError,
} from '../services/payment.service';
import {
  activateSubscription,
  startTrial,
  extendSubscription,
  cancelSubscription,
  upgradeSubscription,
  downgradeSubscription,
  generateSaaSInvoice,
} from '../services/subscription.service';
import { getGymSubscriptionSummary } from '../services/entitlements.service';
import { clearSubscriptionCache } from '../middlewares/subscription.middleware';

export const DAY_MS = 24 * 60 * 60 * 1000;

// Defense-in-depth: every cross-tenant handler must verify the caller is a
// Super Admin inside the controller, even when the route guard already enforces
// it. This keeps tenant data safe if a handler is ever re-mounted elsewhere.
const requireSuperAdmin = (req: AuthRequest, res: Response): boolean => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    return false;
  }
  return true;
};

// ========================================
// PUBLIC & SUPER ADMIN: PLAN MANAGEMENT
// ========================================

export const getSaaSPlans = async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.all === 'true';
    const plans = await prisma.saaSPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    // Parse features for each plan
    const parsed = plans.map((p) => ({
      ...p,
      features: (() => { try { return JSON.parse(p.features || '[]'); } catch { return []; } })(),
    }));
    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

export const createSaaSPlan = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const { name, code, description, monthlyPrice, quarterlyPrice, halfYearlyPrice, yearlyPrice, currency, maxGyms, maxMembers, maxTrainers, maxStaff, maxBranches, maxClasses, maxStorageMB, advancedReports, features, isActive, sortOrder } = req.body;

    const plan = await prisma.saaSPlan.create({
      data: {
        name,
        code,
        description: description ?? null,
        monthlyPrice: monthlyPrice ?? 0,
        quarterlyPrice: quarterlyPrice ?? 0,
        halfYearlyPrice: halfYearlyPrice ?? 0,
        yearlyPrice: yearlyPrice ?? 0,
        currency: currency || 'INR',
        maxGyms: maxGyms ?? 1,
        maxMembers: maxMembers ?? null,
        maxTrainers: maxTrainers ?? null,
        maxStaff: maxStaff ?? null,
        maxBranches: maxBranches ?? 1,
        maxClasses: maxClasses ?? null,
        maxStorageMB: maxStorageMB ?? null,
        advancedReports: advancedReports ?? false,
        features: JSON.stringify(features ?? []),
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      },
    });

    await logAudit({
      action: 'SAAS_PLAN_CREATED',
      entity: 'SaaSPlan',
      entityId: plan.id,
      details: JSON.stringify({ name, monthlyPrice, code }),
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

export const updateSaaSPlan = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = req.params.id as string;
    const plan = await prisma.saaSPlan.findUnique({ where: { id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const { features, ...rest } = req.body;
    const data: any = { ...rest };
    if (features !== undefined) data.features = JSON.stringify(features);

    const updated = await prisma.saaSPlan.update({ where: { id }, data });

    await logAudit({
      action: 'SAAS_PLAN_UPDATED',
      entity: 'SaaSPlan',
      entityId: id,
      details: JSON.stringify({ name: updated.name }),
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

export const deleteSaaSPlan = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
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

// ========================================
// SUPER ADMIN: SUBSCRIPTION MANAGEMENT
// ========================================

export const getSubscriptions = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const { status, gymId } = req.query as { status?: string; gymId?: string };
    const subscriptions = await prisma.gymSubscription.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(gymId ? { gymId } : {}),
      },
      include: {
        gym: { select: { id: true, name: true, city: true, ownerId: true } },
        plan: { select: { id: true, name: true, code: true, monthlyPrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subscriptions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
};

export const createSubscription = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const { gymId, planId, startDate } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    const plan = await prisma.saaSPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const start = startDate ? new Date(startDate) : new Date();
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid start date' });

    const months = 1; // Default monthly
    const end = new Date(start.getTime());
    end.setMonth(end.getMonth() + months);

    const subscription = await prisma.gymSubscription.create({
      data: {
        gymId,
        planId,
        status: 'ACTIVE',
        startDate: start,
        endDate: end,
        amount: plan.monthlyPrice,
      },
      include: { plan: { select: { name: true } }, gym: { select: { name: true } } },
    });

    await prisma.gym.update({ where: { id: gymId }, data: { isApproved: true } });

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

    clearSubscriptionCache(gymId);
    res.status(201).json(subscription);
  } catch {
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

export const updateSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = req.params.id as string;
    const { status } = req.body as { status: string };

    if (!['ACTIVE', 'PENDING', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'TRIAL', 'GRACE_PERIOD'].includes(status)) {
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

    clearSubscriptionCache(subscription.gymId);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

// ========================================
// GYM ADMIN: SUBSCRIPTION PURCHASE
// ========================================

export const getMyGymSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const gym = await prisma.gym.findFirst({ where: { ownerId: userId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const summary = await getGymSubscriptionSummary(gym.id);
    res.json(summary);
  } catch {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

interface SaaSQuote {
  gym: { id: string; ownerId: string; name: string; isApproved: boolean };
  plan: { id: string; name: string };
  cycle: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  months: number;
  amount: number;
  start: Date;
  end: Date;
}

const quoteError = (status: number, error: string) => {
  const err = new Error(error) as Error & { status?: number };
  err.status = status;
  return err;
};

const getSaaSQuote = async (input: {
  planId: string;
  billingCycle?: string;
  gymId?: string;
  userId: string;
  role: string;
}): Promise<SaaSQuote> => {
  const isSuperAdmin = input.role === 'SUPER_ADMIN';
  const gym = isSuperAdmin && input.gymId
    ? await prisma.gym.findUnique({ where: { id: input.gymId } })
    : await prisma.gym.findFirst({ where: { ownerId: input.userId } });

  if (!gym) throw quoteError(404, 'Gym not found');
  if (!gym.isApproved) throw quoteError(403, 'Your gym must be approved before subscribing');

  const plan = await prisma.saaSPlan.findUnique({ where: { id: input.planId } });
  if (!plan || !plan.isActive) throw quoteError(404, 'Plan not found');

  const cycle = (input.billingCycle ?? 'MONTHLY') as 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  if (!['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(cycle)) throw quoteError(400, 'Invalid billing cycle');

  const months = cycle === 'YEARLY' ? 12 : cycle === 'HALF_YEARLY' ? 6 : cycle === 'QUARTERLY' ? 3 : 1;
  const amount = (cycle === 'YEARLY' ? plan.yearlyPrice :
    cycle === 'HALF_YEARLY' ? plan.halfYearlyPrice :
    cycle === 'QUARTERLY' ? plan.quarterlyPrice :
    plan.monthlyPrice).toNumber();

  const active = await prisma.gymSubscription.findFirst({
    where: { gymId: gym.id, status: { in: ['ACTIVE', 'PENDING', 'TRIAL'] } },
  });
  if (active) throw quoteError(409, 'This gym already has an active or pending subscription');

  const start = new Date();
  const end = new Date(start.getTime());
  end.setMonth(end.getMonth() + months);

  return { gym, plan, cycle, months, amount, start, end };
};

const createPendingSubscription = async (quote: SaaSQuote, paymentMethod: string | undefined, userId: string) => {
  const subscription = await prisma.gymSubscription.create({
    data: {
      gymId: quote.gym.id,
      planId: quote.plan.id,
      status: 'PENDING',
      startDate: quote.start,
      endDate: quote.end,
      amount: quote.amount,
      billingCycle: quote.cycle,
      paymentMethod: paymentMethod ?? null,
    },
    include: { plan: { select: { name: true } }, gym: { select: { name: true } } },
  });

  await createNotification({
    userId: quote.gym.ownerId,
    type: 'INFO',
    title: 'Subscription purchase submitted',
    message: `Your ${quote.plan.name} subscription request is pending payment of ₹${subscription.amount.toNumber().toLocaleString('en-IN')}.`,
    link: '/subscription',
  });

  await logAudit({
    action: 'SUBSCRIPTION_PURCHASED',
    entity: 'GymSubscription',
    entityId: subscription.id,
    details: JSON.stringify({ gymId: quote.gym.id, planId: quote.plan.id, amount: subscription.amount, paymentMethod }),
    userId,
  });

  return subscription;
};

export const purchaseSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const quote = await getSaaSQuote({ ...req.body, userId, role: req.user!.role });
    const subscription = await createPendingSubscription(quote, req.body.paymentMethod, userId);
    res.status(201).json(subscription);
  } catch (error: any) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error('[saas] purchaseSubscription failed:', error);
    res.status(500).json({ error: 'Failed to purchase subscription' });
  }
};

export const checkoutSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const role = req.user!.role;
    const paymentMethod = (req.body.paymentMethod as string | undefined) ?? 'CASH';
    const quote = await getSaaSQuote({ ...req.body, userId, role });
    const subscription = await createPendingSubscription(quote, paymentMethod, userId);

    const wantsOnline = paymentMethod === 'UPI' || paymentMethod === 'CARD';
    if (wantsOnline && onlinePaymentsEnabled()) {
      const order = await createSaaSOrder(subscription.id);
      return res.status(201).json({
        mode: 'online',
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        subscription,
      });
    }

    res.status(201).json({ mode: 'manual', subscription });
  } catch (error: any) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    if (error instanceof PaymentDisabledError) {
      return res.status(503).json({ error: 'ONLINE_PAYMENTS_DISABLED' });
    }
    console.error('[saas] checkoutSubscription failed:', error);
    res.status(500).json({ error: 'Failed to start subscription checkout' });
  }
};

export const verifySaaS = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await verifySaaSOrder({ ...req.body, userId, role: req.user!.role });
    res.json(result);
  } catch (error: any) {
    const message = error?.message ?? '';
    if (message === 'INVALID_SIGNATURE') return res.status(400).json({ error: 'Payment verification failed' });
    if (message === 'SUBSCRIPTION_NOT_FOUND') return res.status(404).json({ error: 'Subscription not found' });
    if (message === 'SUBSCRIPTION_NOT_OWNED') return res.status(403).json({ error: 'You can only verify your own subscription payments' });
    console.error('[saas] verifySaaS failed:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};

// ========================================
// GYM ADMIN: TRIAL & LIFECYCLE
// ========================================

export const startTrialHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const gym = await prisma.gym.findFirst({ where: { ownerId: userId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const { planId, trialDays } = req.body;
    const subscription = await startTrial(gym.id, planId, trialDays || 7);
    res.status(201).json(subscription);
  } catch (error: any) {
    const message = error?.message || '';
    if (message.includes('NOT_FOUND')) return res.status(404).json({ error: message.replace('_', ' ') });
    console.error('[saas] startTrial failed:', error);
    res.status(500).json({ error: 'Failed to start trial' });
  }
};

// ========================================
// SUPER ADMIN: EXTEND / CANCEL / UPGRADE
// ========================================

export const extendSubscriptionHandler = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = req.params.id as string;
    const { days } = req.body;
    const result = await extendSubscription(id, days, req.user!.userId);
    res.json(result);
  } catch (error: any) {
    if (error?.message === 'SUBSCRIPTION_NOT_FOUND') return res.status(404).json({ error: 'Subscription not found' });
    res.status(500).json({ error: 'Failed to extend subscription' });
  }
};

export const cancelSubscriptionHandler = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const result = await cancelSubscription(id, reason, req.user!.userId);
    res.json(result);
  } catch (error: any) {
    if (error?.message === 'SUBSCRIPTION_NOT_FOUND') return res.status(404).json({ error: 'Subscription not found' });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

export const upgradeSubscriptionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const gym = req.user!.role === 'SUPER_ADMIN'
      ? await prisma.gym.findUnique({ where: { id: req.body.gymId } })
      : await prisma.gym.findFirst({ where: { ownerId: userId } });

    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const result = await upgradeSubscription(gym.id, req.body.planId, userId);
    res.json(result);
  } catch (error: any) {
    const message = error?.message || '';
    if (message.includes('NOT_FOUND')) return res.status(404).json({ error: message.replace('_', ' ') });
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
};

export const downgradeSubscriptionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const gym = req.user!.role === 'SUPER_ADMIN'
      ? await prisma.gym.findUnique({ where: { id: req.body.gymId } })
      : await prisma.gym.findFirst({ where: { ownerId: userId } });

    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const result = await downgradeSubscription(gym.id, req.body.planId, userId);
    res.json(result);
  } catch (error: any) {
    const message = error?.message || '';
    if (message.includes('NOT_FOUND')) return res.status(404).json({ error: message.replace('_', ' ') });
    res.status(500).json({ error: 'Failed to downgrade subscription' });
  }
};

// ========================================
// INVOICES
// ========================================

export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let gymId: string | undefined;
    if (req.user!.role === 'SUPER_ADMIN') {
      gymId = req.query.gymId as string | undefined;
    } else {
      const gym = await prisma.gym.findFirst({ where: { ownerId: userId } });
      if (!gym) return res.status(404).json({ error: 'Gym not found' });
      gymId = gym.id;
    }

    const where = gymId ? { gymId } : {};
    const invoices = await prisma.subscriptionInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const generateInvoiceHandler = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const { subscriptionId } = req.body;
    const invoice = await generateSaaSInvoice(subscriptionId);
    res.status(201).json(invoice);
  } catch (error: any) {
    if (error?.message === 'SUBSCRIPTION_NOT_FOUND') return res.status(404).json({ error: 'Subscription not found' });
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};
