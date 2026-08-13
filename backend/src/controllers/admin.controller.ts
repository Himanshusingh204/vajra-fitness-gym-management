import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit } from '../utils/audit';
import { prisma } from '../utils/prisma';
import { createNotification } from '../services/notification.service';

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

// Helper function to calculate monthly revenue
async function calculateMonthlyRevenue() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    months.push({ startOfMonth, endOfMonth, label: startOfMonth.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) });
  }
  return months;
}

// Helper to calculate churn rate
async function calculateChurnRate() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Get subscriptions that were active 30 days ago
  const subscriptions30DaysAgo = await prisma.gymSubscription.findMany({
    where: {
      startDate: { lte: thirtyDaysAgo },
      endDate: { gte: thirtyDaysAgo }
    },
    include: { plan: true }
  });
  
  // Get subscriptions that are currently active
  const activeSubscriptions = await prisma.gymSubscription.findMany({
    where: {
      status: 'ACTIVE',
      startDate: { lte: now },
      endDate: { gte: now }
    },
    include: { plan: true }
  });
  
  const previousCount = subscriptions30DaysAgo.length;
  const currentCount = activeSubscriptions.length;
  const churnedCount = Math.max(0, previousCount - currentCount);
  const churnRate = previousCount > 0 ? (churnedCount / previousCount) * 100 : 0;
  
  return { churnRate, churnedCount, previousCount, currentCount };
}

// Get all gym registrations (pending/approved)
export const getGyms = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const gyms = await prisma.gym.findMany({
      include: {
        owner: { select: { username: true, email: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(gyms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
};

// Approve a gym registration
export const approveGym = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const gymId = req.params.gymId as string;

    const gym = await prisma.gym.update({
      where: { id: gymId },
      data: { isApproved: true },
      include: { owner: { select: { id: true, username: true } } },
    });

    // Re-activate the owner so they can access their dashboard again.
    await prisma.user.update({ where: { id: gym.owner.id }, data: { isActive: true } });

    await createNotification({
      userId: gym.owner.id,
      type: 'SUCCESS',
      title: 'Your gym is approved',
      message: `${gym.name} is now live on the Vajra Fitness platform.`,
      link: '/admin/gym',
    });

    await logAudit({
      action: 'GYM_APPROVED',
      entity: 'Gym',
      entityId: gymId,
      details: JSON.stringify({ name: gym.name }),
      userId: req.user?.userId ?? null,
    });

    res.json({ message: 'Gym approved successfully', gym });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve gym' });
  }
};

// Suspend a gym
export const suspendGym = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const gymId = req.params.gymId as string;

    const gym = await prisma.gym.update({
      where: { id: gymId },
      data: { isApproved: false },
      include: { owner: { select: { id: true, username: true } } },
    });

    // Revoke access immediately: deactivate the owner and invalidate all of
    // their active sessions (tokenVersion bump) so a live JWT stops working.
    await prisma.user.update({
      where: { id: gym.owner.id },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });

    await createNotification({
      userId: gym.owner.id,
      type: 'ERROR',
      title: 'Your gym has been suspended',
      message: `${gym.name} was suspended by the platform. Contact support to resolve this.`,
      link: '/contact',
    });

    await logAudit({
      action: 'GYM_SUSPENDED',
      entity: 'Gym',
      entityId: gymId,
      details: JSON.stringify({ name: gym.name }),
      userId: req.user?.userId ?? null,
    });

    res.json({ message: 'Gym suspended successfully', gym });
  } catch (error) {
    res.status(500).json({ error: 'Failed to suspend gym' });
  }
};

export const getPlatformAnalytics = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Basic counts
    const totalGyms = await prisma.gym.count();
    const activeGyms = await prisma.gym.count({ where: { isApproved: true } });
    const pendingGyms = totalGyms - activeGyms;
    const totalMembers = await prisma.memberDetails.count();
    const totalStaff = await prisma.staffDetails.count();
    const totalTrainers = await prisma.staffDetails.count({ where: { role: 'TRAINER' } });
    
    // Revenue
    const revenueResult = await prisma.fee.aggregate({
      _sum: { amount: true },
      where: { status: 'PAID' },
    });
    const platformRevenue = revenueResult._sum.amount ?? 0;
    
    const pendingMembers = await prisma.memberDetails.count({ where: { status: 'PENDING' } });
    
    // ============ SAAS METRICS ============
    // All subscriptions
    const allSubscriptions = await prisma.gymSubscription.findMany({
      include: { plan: true, gym: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // Active subscriptions
    const activeSubscriptions = allSubscriptions.filter(s => 
      s.status === 'ACTIVE' && 
      new Date(s.startDate) <= now && 
      new Date(s.endDate) >= now
    );
    
    // Trial subscriptions
    const trialSubscriptions = allSubscriptions.filter(s => s.status === 'TRIAL');
    
    // Past due subscriptions
    const pastDueSubscriptions = allSubscriptions.filter(s => s.status === 'PAST_DUE');
    
    // Expired subscriptions
    const expiredSubscriptions = allSubscriptions.filter(s => s.status === 'EXPIRED' || s.status === 'CANCELLED');
    
    // MRR - Monthly Recurring Revenue from active subscriptions
    const mrr = activeSubscriptions.reduce((sum, sub) => {
      let monthlyAmount = sub.amount.toNumber();
      if (sub.billingCycle === 'QUARTERLY') monthlyAmount = sub.amount.toNumber() / 3;
      else if (sub.billingCycle === 'HALF_YEARLY') monthlyAmount = sub.amount.toNumber() / 6;
      else if (sub.billingCycle === 'YEARLY') monthlyAmount = sub.amount.toNumber() / 12;
      return sum + monthlyAmount;
    }, 0);
    
    // ARR - Annual Recurring Revenue
    const arr = mrr * 12;
    
    // Revenue by plan
    const revenueByPlan = activeSubscriptions.reduce((acc, sub) => {
      const planName = sub.plan?.name || 'Unknown';
      let monthlyAmount = sub.amount.toNumber();
      if (sub.billingCycle === 'QUARTERLY') monthlyAmount = sub.amount.toNumber() / 3;
      else if (sub.billingCycle === 'HALF_YEARLY') monthlyAmount = sub.amount.toNumber() / 6;
      else if (sub.billingCycle === 'YEARLY') monthlyAmount = sub.amount.toNumber() / 12;
      acc[planName] = (acc[planName] || 0) + monthlyAmount;
      return acc;
    }, {} as Record<string, number>);
    
    // Churn calculation
    const subscriptions30DaysAgo = allSubscriptions.filter(s => 
      new Date(s.startDate) <= thirtyDaysAgo && 
      new Date(s.endDate) >= thirtyDaysAgo
    );
    const previousCount = subscriptions30DaysAgo.length;
    const currentCount = activeSubscriptions.length;
    const churnedCount = Math.max(0, previousCount - currentCount);
    const churnRate = previousCount > 0 ? (churnedCount / previousCount) * 100 : 0;
    
    // New subscriptions this month
    const newSubscriptionsThisMonth = allSubscriptions.filter(s => 
      new Date(s.createdAt) >= new Date(now.getFullYear(), now.getMonth(), 1)
    ).length;
    
    // Trial to paid conversion
    const trialsLast30Days = allSubscriptions.filter(s => 
      s.status === 'TRIAL' && new Date(s.createdAt) >= thirtyDaysAgo
    ).length;
    const convertedFromTrial = allSubscriptions.filter(s => 
      s.status === 'ACTIVE' && s.trialEndsAt && new Date(s.trialEndsAt) >= thirtyDaysAgo && new Date(s.trialEndsAt) <= now
    ).length;
    const trialConversionRate = trialsLast30Days > 0 ? (convertedFromTrial / trialsLast30Days) * 100 : 0;
    
    // Failed payments this month
    const failedPayments = await prisma.paymentOrder.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
      }
    });
    
    // Monthly revenue trend (last 6 months)
    const monthlyRevenueTrend = await Promise.all(Array.from({ length: 6 }, async (_, index) => {
      const i = 5 - index;
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const [monthFees, monthSubscriptions] = await Promise.all([
        prisma.fee.aggregate({
          _sum: { amount: true },
          where: {
            status: 'PAID',
            paymentDate: { gte: startOfMonth, lte: endOfMonth }
          }
        }),
        prisma.gymSubscription.findMany({
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
            status: { in: ['ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED'] }
          },
          include: { plan: true }
        }),
      ]);
      
      const subscriptionRevenue = monthSubscriptions.reduce((sum, sub) => sum + sub.amount.toNumber(), 0);
      
      return {
        month: startOfMonth.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        fees: monthFees._sum.amount?.toNumber() ?? 0,
        subscriptions: subscriptionRevenue,
        total: (monthFees._sum.amount?.toNumber() ?? 0) + subscriptionRevenue
      };
    }));
    
    // ARPU - Average Revenue Per User (gym)
    const arpu = activeGyms > 0 ? mrr / activeGyms : 0;
    
    // CLTV - Customer Lifetime Value (simplified: ARPU / monthly churn rate)
    const monthlyChurnRate = churnRate / 100;
    const cltv = monthlyChurnRate > 0 ? arpu / monthlyChurnRate : 0;
    
    // Active members across all gyms
    const activeMembers = await prisma.memberDetails.count({ where: { status: 'ACTIVE' } });
    
    // Gyms by status
    const gymsByStatus = {
      active: activeGyms,
      pending: pendingGyms,
      trial: trialSubscriptions.length,
      past_due: pastDueSubscriptions.length,
      expired: expiredSubscriptions.length,
    };
    
    // Top performing gyms by member count
    const topGyms = await prisma.gym.findMany({
      where: { isApproved: true },
      include: {
        _count: { select: { members: true } },
        subscriptions: { 
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { members: { _count: 'desc' } },
      take: 10
    });
    
    res.json({
      // Basic metrics
      totalGyms,
      activeGyms,
      pendingGyms,
      totalMembers,
      pendingMembers,
      totalStaff,
      totalTrainers,
      activeMembers,
      platformRevenue,
      
      // SaaS metrics
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      arpu: Math.round(arpu * 100) / 100,
      cltv: Math.round(cltv * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      churnedCount,
      newSubscriptionsThisMonth,
      trialConversionRate: Math.round(trialConversionRate * 100) / 100,
      failedPayments,
      
      // Breakdowns
      revenueByPlan,
      gymsByStatus,
      monthlyRevenueTrend,
      topGyms: topGyms.map(g => ({
        id: g.id,
        name: g.name,
        city: g.city,
        memberCount: g._count.members,
        plan: g.subscriptions[0]?.plan?.name || 'None',
        subscriptionStatus: g.subscriptions[0]?.status || 'NONE'
      }))
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// List all platform users
export const getUsers = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        memberDetails: { select: { status: true, gym: { select: { name: true } } } },
        ownedGyms: { select: { name: true, isApproved: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Suspend or activate a user account (Super Admin only)
export const setUserActive = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ error: 'Cannot suspend a Super Admin account' });
    }
    if (user.id === req.user?.userId) {
      return res.status(400).json({ error: 'Cannot change your own account status' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, username: true, email: true, role: true, isActive: true },
    });

    await logAudit({
      action: isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      entity: 'User',
      entityId: id,
      details: JSON.stringify({ username: user.username, email: user.email }),
      userId: req.user?.userId ?? null,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

// ---------------- CMS: FAQs ----------------
export const getFaqs = async (_req: Request, res: Response) => {
  try {
    const faqs = await prisma.fAQ.findMany({ orderBy: { order: 'asc' } });
    res.json(faqs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
};

export const createFaq = async (req: Request, res: Response) => {
  try {
    const { question, answer, category, isActive, order } = req.body;
    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        category: category ?? null,
        isActive: isActive ?? true,
        order: order ?? 0,
      },
    });
    res.status(201).json(faq);
  } catch {
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
};

export const updateFaq = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { question, answer, category, isActive, order } = req.body;
    const faq = await prisma.fAQ.update({
      where: { id },
      data: { question, answer, category, isActive, order },
    });
    res.json(faq);
  } catch {
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
};

export const deleteFaq = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.fAQ.delete({ where: { id } });
    res.json({ message: 'FAQ deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
};

// ---------------- CMS: Testimonials ----------------
export const getTestimonials = async (_req: Request, res: Response) => {
  try {
    const testimonials = await prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(testimonials);
  } catch {
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
};

export const createTestimonial = async (req: Request, res: Response) => {
  try {
    const { name, role, content, imageUrl, gymName, rating, featured, isActive } = req.body;
    const testimonial = await prisma.testimonial.create({
      data: {
        name,
        role,
        content,
        imageUrl: imageUrl ?? null,
        gymName: gymName ?? null,
        rating: rating ?? 5,
        featured: featured ?? false,
        isActive: isActive ?? true,
      },
    });
    res.status(201).json(testimonial);
  } catch {
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
};

export const updateTestimonial = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, role, content, imageUrl, gymName, rating, featured, isActive } = req.body;
    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: { name, role, content, imageUrl, gymName, rating, featured, isActive },
    });
    res.json(testimonial);
  } catch {
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
};

export const deleteTestimonial = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.testimonial.delete({ where: { id } });
    res.json({ message: 'Testimonial deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
};

// ---------------- CMS: Site Content ----------------
export const getSiteContent = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const entries = await prisma.siteContent.findMany({ orderBy: { key: 'asc' } });
    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Failed to fetch site content' });
  }
};

export const createSiteContent = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const { key, value, section, isActive } = req.body;
    const entry = await prisma.siteContent.create({
      data: {
        key,
        value: value ?? '',
        section: section ?? null,
        isActive: isActive ?? true,
        updatedBy: req.user?.userId ?? null,
      },
    });
    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: 'Failed to create site content' });
  }
};

export const updateSiteContent = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = req.params.id as string;
    const { key, value, section, isActive } = req.body;
    const entry = await prisma.siteContent.update({
      where: { id },
      data: { key, value, section, isActive, updatedBy: req.user?.userId ?? null },
    });
    res.json(entry);
  } catch {
    res.status(500).json({ error: 'Failed to update site content' });
  }
};

export const deleteSiteContent = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = req.params.id as string;
    await prisma.siteContent.delete({ where: { id } });
    res.json({ message: 'Site content deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete site content' });
  }
};

// ---------------- Support tickets (admin view) ----------------
export const getSupportTickets = async (_req: Request, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: { user: { select: { username: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch {
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
};

export const updateSupportTicket = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, priority } = req.body;
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status, priority },
    });
    res.json(ticket);
  } catch {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

// ---------------- Audit logs ----------------
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { username: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// ---------------- Super Admin: gym profile editing ----------------
// Lets a Super Admin correct a gym's details (address, GST, images, facilities)
// directly, without needing the gym owner.
// Permanently delete a gym and all of its tenant-scoped data (members, staff,
// trainers, fees, bookings, subscriptions, etc. all cascade at the DB level).
// The owner's account is preserved unless this was their only gym, in which
// case it is deactivated the same way suspendGym does.
export const deleteGym = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const gymId = req.params.gymId as string;

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      include: {
        owner: { select: { id: true, username: true, email: true } },
        _count: { select: { members: true, staff: true, trainers: true, subscriptions: true } },
      },
    });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    await prisma.gym.delete({ where: { id: gymId } });

    const remainingGyms = await prisma.gym.count({ where: { ownerId: gym.owner.id } });
    if (remainingGyms === 0) {
      await prisma.user.update({
        where: { id: gym.owner.id },
        data: { isActive: false, tokenVersion: { increment: 1 } },
      });
    }

    await logAudit({
      action: 'GYM_DELETED',
      entity: 'Gym',
      entityId: gymId,
      details: JSON.stringify({
        name: gym.name,
        city: gym.city,
        ownerEmail: gym.owner.email,
        memberCount: gym._count.members,
        staffCount: gym._count.staff,
        trainerCount: gym._count.trainers,
      }),
      userId: req.user?.userId ?? null,
    });

    res.json({ message: 'Gym and all associated data deleted permanently' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete gym' });
  }
};

export const updateGymProfile = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const gymId = req.params.gymId as string;
    const { name, address, city, state, location, gstNumber, logoUrl, imageUrl, facilities } = req.body;

    const existing = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!existing) return res.status(404).json({ error: 'Gym not found' });

    const gym = await prisma.gym.update({
      where: { id: gymId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(gstNumber !== undefined ? { gstNumber } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(facilities !== undefined ? { facilities } : {}),
      },
    });

    await logAudit({
      action: 'GYM_UPDATED',
      entity: 'Gym',
      entityId: gymId,
      details: JSON.stringify({ name: gym.name }),
      userId: req.user?.userId ?? null,
    });

    res.json(gym);
  } catch {
    res.status(500).json({ error: 'Failed to update gym' });
  }
};

// ---------------- Super Admin: payments across all gyms ----------------
// Global fee ledger so the platform can see (and issue receipts for) every
// payment on the system.
export const getAllFees = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const { status, gymId } = req.query as { status?: string; gymId?: string };
    const fees = await prisma.fee.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(gymId ? { gymId } : {}),
      },
      include: {
        member: { include: { user: { select: { username: true, email: true } } } },
        gym: { select: { id: true, name: true, gstNumber: true } },
      },
      orderBy: { dueDate: 'desc' },
      take: 500,
    });
    res.json(fees);
  } catch {
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
};

// Super Admin: view platform contact-form messages.
export const getPlatformMessages = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const messages = await prisma.platformMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Super Admin: mark a platform message as read / archived.
export const updatePlatformMessage = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = req.params.id as string;
    const { status } = req.body as { status?: string };
    if (!status || !['NEW', 'READ', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid message status' });
    }

    const message = await prisma.platformMessage.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const updated = await prisma.platformMessage.update({ where: { id }, data: { status } });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update message' });
  }
};
