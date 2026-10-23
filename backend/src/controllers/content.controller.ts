import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { FRONTEND_URL } from '../utils/env';
import { getOrSetJSON } from '../utils/cache';

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
        where: { role: 'TRAINER', isActive: true, trainerDetails: { status: 'ACTIVE', gym: { isApproved: true } } },
      }),
      prisma.gym.groupBy({ by: ['city'], where: { isApproved: true, city: { not: '' } } }),
    ]);
    res.json({ gyms, members, trainers, cities: cityGroups.length });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// Public gym page. Approved gyms only, and only what a visitor should see:
// no owner details, no GSTIN, no trainer contact details.
export const getPublicGym = async (req: Request, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const gym = await getOrSetJSON(`public-gym:${gymId}`, 60, async () => {
      const row = await prisma.gym.findFirst({
        where: { id: gymId, isApproved: true },
        select: {
          id: true,
          name: true,
          tagline: true,
          address: true,
          city: true,
          state: true,
          location: true,
          facilities: true,
          brandColor: true,
          imageUrl: true,
          logoUrl: true,
          membershipPlans: {
            where: { isActive: true },
            orderBy: { price: 'asc' },
            select: { id: true, name: true, description: true, price: true, duration: true },
          },
          trainers: {
            where: { status: 'ACTIVE', user: { isActive: true } },
            orderBy: { joiningDate: 'asc' },
            select: { specialization: true, experienceYears: true, user: { select: { username: true } } },
          },
          branches: {
            where: { status: 'APPROVED', isActive: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, city: true },
          },
        },
      });
      if (!row) return null;

      const { membershipPlans, trainers, ...rest } = row;
      return {
        ...rest,
        plans: membershipPlans.map((p) => ({ ...p, price: Number(p.price) })),
        trainerCount: trainers.length,
        trainers: trainers.map((t) => ({
          name: t.user.username,
          specialization: t.specialization,
          experienceYears: t.experienceYears,
        })),
      };
    });

    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    res.json(gym);
  } catch {
    res.status(500).json({ error: 'Failed to fetch gym' });
  }
};

const SITEMAP_PAGES = [
  '/',
  '/about',
  '/gyms',
  '/membership',
  '/subscription',
  '/contact',
  '/help',
  '/faq',
  '/tools',
  '/tools/bmi-calculator',
  '/tools/calorie-calculator',
  '/tools/one-rep-max-calculator',
  '/tools/protein-calculator',
  '/register',
  '/register/member',
  '/register/trainer',
  '/register/partner',
  '/login',
  '/terms',
  '/privacy',
  '/refund',
  '/cookies',
];

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const getSitemap = async (_req: Request, res: Response) => {
  try {
    const base = (process.env.PUBLIC_SITE_URL || 'https://vajra-fitness-gym-management.vercel.app').replace(/\/+$/, '');
    const gyms = await prisma.gym.findMany({
      where: { isApproved: true },
      select: { id: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const urls = [
      ...SITEMAP_PAGES.map((path) => `  <url><loc>${escapeXml(base + path)}</loc></url>`),
      ...gyms.map(
        (g) => `  <url><loc>${escapeXml(`${base}/gyms/${g.id}`)}</loc><lastmod>${g.updatedAt.toISOString()}</lastmod></url>`,
      ),
    ];
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      '</urlset>',
      '',
    ].join('\n');

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch {
    res.status(500).json({ error: 'Failed to build sitemap' });
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
