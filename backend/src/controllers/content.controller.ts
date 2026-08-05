import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getPublicFaqs = async (_req: Request, res: Response) => {
  try {
    const faqs = await prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    res.json(faqs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
};

export const getPublicTestimonials = async (_req: Request, res: Response) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    res.json(testimonials);
  } catch {
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
};
