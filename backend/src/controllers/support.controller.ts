import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit } from '../utils/audit';
import { prisma } from '../utils/prisma';

export const createTicket = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { subject, message, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        subject,
        message,
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        userId: userId!,
      },
    });

    await logAudit({
      action: 'SUPPORT_TICKET_CREATED',
      entity: 'SupportTicket',
      entityId: ticket.id,
      details: JSON.stringify({ subject }),
      userId: userId ?? null,
    });

    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
};

export const getMyTickets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};
