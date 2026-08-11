import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { FRONTEND_URL } from '../utils/env';

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
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 12,
    });
    res.json(testimonials);
  } catch {
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
};

export const getPublicSiteContent = async (_req: Request, res: Response) => {
  try {
    const entries = await prisma.siteContent.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' },
    });
    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Failed to fetch site content' });
  }
};

// Public, unauthenticated aggregate platform stats for marketing pages (home/about).
// Only safe aggregate counts are returned — no PII, no per-gym or per-user data.
export const getPublicStats = async (_req: Request, res: Response) => {
  try {
    const [gyms, members, trainers, cityGroups] = await Promise.all([
      prisma.gym.count({ where: { isApproved: true } }),
      prisma.memberDetails.count({ where: { status: 'ACTIVE', gym: { isApproved: true } } }),
      prisma.user.count({
        where: { role: 'TRAINER', isActive: true, trainerDetails: { gym: { isApproved: true } } },
      }),
      prisma.gym.groupBy({ by: ['city'], where: { isApproved: true, city: { not: '' } } }),
    ]);
    res.json({ gyms, members, trainers, cities: cityGroups.length });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// Public white-label branding lookup. Resolves a gym by:
//   1. ?subdomain=<sub>   (e.g. ?subdomain=andheri)
//   2. ?domain=<host>     (exact customDomain match)
//   3. the request Host header (subdomain of FRONTEND_URL's host, or customDomain)
// Returns only branding-safe fields so a white-label portal can skin itself.
export const getGymBranding = async (req: Request, res: Response) => {
  try {
    const sub = String(req.query.subdomain || '').trim().toLowerCase();
    const domain = String(req.query.domain || '').trim().toLowerCase();
    const host = String(req.headers.host || '').split(':')[0]!.toLowerCase();

    const base = (() => {
      try { return new URL(FRONTEND_URL).hostname.toLowerCase(); } catch { return ''; }
    })();

    let where: { subdomain: string } | { customDomain: string } | undefined;
    if (sub) {
      where = { subdomain: sub };
    } else if (domain) {
      where = { customDomain: domain };
    } else if (host && base && host.endsWith(`.${base}`)) {
      const derived = host.slice(0, host.length - base.length - 1);
      if (derived && !derived.includes('.')) where = { subdomain: derived };
    } else if (host && base && host !== base) {
      // Exact custom-domain match (e.g. https://gym.example.com hits this API).
      where = { customDomain: host };
    }

    if (!where) return res.status(404).json({ error: 'No branding configured for this host' });

    const gym = await prisma.gym.findFirst({ where });
    if (!gym) return res.status(404).json({ error: 'No branding configured for this host' });

    res.json({
      id: gym.id,
      name: gym.name,
      tagline: gym.tagline,
      logoUrl: gym.logoUrl,
      imageUrl: gym.imageUrl,
      brandColor: gym.brandColor,
      city: gym.city,
      state: gym.state,
      address: gym.address,
      facilities: gym.facilities,
      isApproved: gym.isApproved,
      subdomain: gym.subdomain,
      customDomain: gym.customDomain,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch branding' });
  }
};
