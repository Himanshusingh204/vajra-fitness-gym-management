import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';

// Get enquiries for a gym
export const getEnquiries = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || gym.ownerId !== req.user?.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const enquiries = await prisma.enquiry.findMany({
      where: { gymId },
      orderBy: { date: 'desc' }
    });
    res.json(enquiries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
};

// Create a new enquiry (Walk-in or online)
export const createEnquiry = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { name, phone, email, notes } = req.body;

    // Only accept enquiries for gyms that actually exist and are approved.
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || !gym.isApproved) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        gymId,
        name,
        phone,
        email,
        notes,
        status: 'PENDING',
        date: new Date()
      }
    });
    res.status(201).json(enquiry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create enquiry' });
  }
};

// Update an enquiry status (e.g. CONVERTED)
export const updateEnquiry = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, notes } = req.body;

    if (status && !['PENDING', 'CONVERTED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid enquiry status' });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const isGymOwner = enquiry.gym.ownerId === req.user?.userId;
    if (!isSuperAdmin && !isGymOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.enquiry.update({
      where: { id },
      data: { status, notes }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
};

export const handleContactForm = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required.' });
    }

    // Store as a general enquiry under the system — gymId left as a sentinel
    const firstGym = await prisma.gym.findFirst();
    if (!firstGym) {
      return res.status(201).json({ message: 'Message received. We will get back to you soon.' });
    }

    await prisma.enquiry.create({
      data: {
        gymId: firstGym.id,
        name,
        phone: phone || 'N/A',
        email,
        notes: `Subject: ${subject || 'General'} — ${message}`,
        status: 'PENDING',
        date: new Date(),
      },
    });
    res.status(201).json({ message: 'Message received. We will get back to you soon.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message.' });
  }
};
