import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit } from '../utils/audit';
import { prisma } from '../utils/prisma';

// Get all gym registrations (pending/approved)
export const getGyms = async (req: AuthRequest, res: Response) => {
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
  try {
    const gymId = req.params.gymId as string;

    const gym = await prisma.gym.update({
      where: { id: gymId },
      data: { isApproved: true }
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
  try {
    const gymId = req.params.gymId as string;

    const gym = await prisma.gym.update({
      where: { id: gymId },
      data: { isApproved: false }
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
  try {
    const totalGyms = await prisma.gym.count();
    const activeGyms = await prisma.gym.count({ where: { isApproved: true } });
    const pendingGyms = totalGyms - activeGyms;
    const totalMembers = await prisma.memberDetails.count();
    const totalStaff = await prisma.staffDetails.count();

    const revenueResult = await prisma.fee.aggregate({
      _sum: { amount: true },
      where: { status: 'PAID' },
    });

    const pendingMembers = await prisma.memberDetails.count({ where: { status: 'PENDING' } });

    res.json({
      totalGyms,
      activeGyms,
      pendingGyms,
      totalMembers,
      pendingMembers,
      totalStaff,
      platformRevenue: revenueResult._sum.amount ?? 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// List all platform users
export const getUsers = async (req: AuthRequest, res: Response) => {
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
    const { question, answer, isActive, order } = req.body;
    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
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
    const { question, answer, isActive, order } = req.body;
    const faq = await prisma.fAQ.update({
      where: { id },
      data: { question, answer, isActive, order },
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
    const { name, role, content, imageUrl, rating, isActive } = req.body;
    const testimonial = await prisma.testimonial.create({
      data: {
        name,
        role,
        content,
        imageUrl: imageUrl ?? null,
        rating: rating ?? 5,
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
    const { name, role, content, imageUrl, rating, isActive } = req.body;
    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: { name, role, content, imageUrl, rating, isActive },
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
export const getAuditLogs = async (_req: Request, res: Response) => {
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
