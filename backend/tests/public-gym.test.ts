import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedTrainer, seedPlan } from './helpers';

const agent = request(app);

const seedPublicGym = async () => {
  const { user: owner, gym } = await seedAdmin();
  await prisma.gym.update({
    where: { id: gym.id },
    data: { gstNumber: '27ABCDE1234F1Z5', tagline: 'Lift heavy, rest well', facilities: 'Free weights, Sauna', brandColor: '#800020' },
  });
  await seedPlan(gym.id, { name: 'Quarterly', price: 4000, duration: 90 });
  await seedPlan(gym.id, { name: 'Monthly', price: 1500, duration: 30 });
  await prisma.membershipPlan.create({ data: { gymId: gym.id, name: 'Retired', price: 100, duration: 30, isActive: false } });

  const { user: coach, details } = await seedTrainer(gym.id);
  await prisma.user.update({ where: { id: coach.id }, data: { phone: '9876500001' } });
  await prisma.trainerDetails.update({ where: { id: details.id }, data: { experienceYears: 6 } });
  const { user: applicant, details: pending } = await seedTrainer(gym.id);
  await prisma.trainerDetails.update({ where: { id: pending.id }, data: { status: 'PENDING' } });

  await prisma.branch.create({ data: { gymId: gym.id, name: 'Kothrud', address: '4 Road', city: 'Pune', state: 'MH' } });
  await prisma.branch.create({ data: { gymId: gym.id, name: 'Waiting', address: '5 Road', city: 'Pune', state: 'MH', status: 'PENDING' } });

  return { owner, gym, coach, applicant };
};

describe('Public gym page', () => {
  it('returns the approved gym with plans, active trainers and branches', async () => {
    const { gym } = await seedPublicGym();
    const res = await agent.get(`/api/public/gyms/${gym.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: gym.id,
      name: 'Peak Club',
      tagline: 'Lift heavy, rest well',
      city: 'Mumbai',
      brandColor: '#800020',
      trainerCount: 1,
      trainers: [{ name: 'Coach', specialization: 'Strength', experienceYears: 6 }],
      branches: [{ name: 'Kothrud', city: 'Pune' }],
    });
    expect(res.body.plans.map((p: { name: string }) => p.name)).toEqual(['Monthly', 'Quarterly']);
    expect(res.body.plans[0].price).toBe(1500);
  });

  it('leaks no owner or trainer contact details and no GSTIN', async () => {
    const { owner, gym, coach } = await seedPublicGym();
    const res = await agent.get(`/api/public/gyms/${gym.id}`);
    const body = JSON.stringify(res.body);

    for (const secret of [owner.email, owner.id, '9999999999', coach.email, coach.id, '9876500001', '27ABCDE1234F1Z5']) {
      expect(body).not.toContain(secret);
    }
    expect(res.body.ownerId).toBeUndefined();
    expect(res.body.gstNumber).toBeUndefined();
    expect(Object.keys(res.body.trainers[0]).sort()).toEqual(['experienceYears', 'name', 'specialization']);
  });

  it('404s for an unapproved or unknown gym and 400s for a bad id', async () => {
    const { gym } = await seedAdmin({ approved: false });
    expect((await agent.get(`/api/public/gyms/${gym.id}`)).status).toBe(404);
    expect((await agent.get('/api/public/gyms/8d3c3f7e-2b7a-4f7e-9a51-6f1f5c1d2e3a')).status).toBe(404);
    expect((await agent.get('/api/public/gyms/not-a-uuid')).status).toBe(400);
  });

  it('keeps owner data and GSTIN out of the public gym list', async () => {
    const { owner } = await seedPublicGym();
    const res = await agent.get('/api/gym');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].gstNumber).toBeUndefined();
    expect(res.body[0].ownerId).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(owner.id);
    expect(res.body[0].membershipPlans).toHaveLength(2);
  });
});

describe('Sitemap', () => {
  it('lists the public pages and every approved gym', async () => {
    const { gym } = await seedAdmin();
    const { gym: hidden } = await seedAdmin({ approved: false });

    const res = await agent.get('/api/public/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/xml/);
    expect(res.headers['cache-control']).toBe('public, max-age=3600');

    const xml = res.text;
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trim().endsWith('</urlset>')).toBe(true);

    const base = 'https://vajra-fitness-gym-management.vercel.app';
    for (const path of ['/', '/gyms', '/tools/bmi-calculator', '/register/trainer', '/cookies']) {
      expect(xml).toContain(`<loc>${base}${path}</loc>`);
    }
    expect(xml).toMatch(new RegExp(`<loc>${base}/gyms/${gym.id}</loc><lastmod>\\d{4}-\\d{2}-\\d{2}T`));
    expect(xml).not.toContain(hidden.id);
    expect(xml.match(/<url>/g)).toHaveLength(23);
  });

  it('uses PUBLIC_SITE_URL when set', async () => {
    process.env.PUBLIC_SITE_URL = 'https://vajra.example.com/';
    try {
      const res = await agent.get('/api/public/sitemap.xml');
      expect(res.text).toContain('<loc>https://vajra.example.com/about</loc>');
    } finally {
      delete process.env.PUBLIC_SITE_URL;
    }
  });
});
