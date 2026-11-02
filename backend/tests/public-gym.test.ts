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
    data: { gstNumber: '27ABCDE1234F1Z5', tagline: 'Lift heavy, rest well', facilities: ['Free weights', 'Sauna'], brandColor: '#800020' },
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
  await prisma.gymClass.create({ data: { gymId: gym.id, name: 'Morning Yoga', dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00' } });
  await prisma.gymClass.create({ data: { gymId: gym.id, name: 'Old Zumba', isActive: false } });
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
      branches: [{ name: 'Kothrud', city: 'Pune', address: '4 Road', phone: null }],
      classes: [{ name: 'Morning Yoga', dayOfWeek: 'MONDAY', startTime: '06:00' }],
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

  it('serves the same page by approved subdomain', async () => {
    const { gym } = await seedPublicGym();
    await prisma.gym.update({ where: { id: gym.id }, data: { subdomain: 'peak-club' } });
    const res = await agent.get('/api/public/sites/Peak-Club');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(gym.id);
    expect(res.body.plans).toHaveLength(2);
    expect(JSON.stringify(res.body)).not.toContain('27ABCDE1234F1Z5');
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

describe('Gym discovery filters', () => {
  const seedGym = async (data: Record<string, unknown>, price?: number) => {
    const { gym } = await seedAdmin();
    await prisma.gym.update({ where: { id: gym.id }, data });
    if (price) await seedPlan(gym.id, { name: 'Monthly', price, duration: 30 });
    return gym;
  };
  const names = (res: { body: { items: { name: string }[] } }) => res.body.items.map((g) => g.name);

  it('filters by text, city, facility, category and price', async () => {
    await seedGym({ name: 'Iron Den', city: 'Pune', facilities: ['Sauna'], category: 'CROSSFIT' }, 2000);
    await seedGym({ name: 'Zen Studio', city: 'Mumbai', facilities: ['Yoga'], category: 'YOGA' }, 800);
    await seedGym({ name: 'No Plans', city: 'Pune' });
    const get = (qs: string) => agent.get(`/api/gym?paged=1&${qs}`);

    expect(names(await get('q=iron'))).toEqual(['Iron Den']);
    expect(names(await get('q=yoga'))).toEqual(['Zen Studio']);
    expect(names(await get('city=pune&sort=newest'))).toEqual(['No Plans', 'Iron Den']);
    expect(names(await get('facility=Sauna'))).toEqual(['Iron Den']);
    expect(names(await get('category=yoga'))).toEqual(['Zen Studio']);
    expect(names(await get('minPrice=1000'))).toEqual(['Iron Den']);
    expect(names(await get('maxPrice=1000'))).toEqual(['Zen Studio']);
    expect(names(await get('sort=price'))).toEqual(['Zen Studio', 'Iron Den', 'No Plans']);
    expect((await get('lat=95&lng=0')).status).toBe(400);
    expect((await agent.get('/api/gym/cities')).body).toEqual(['Mumbai', 'Pune']);
  });

  it('paginates and returns a plain array without paged', async () => {
    for (const n of ['A', 'B', 'C']) await seedGym({ name: `Gym ${n}` });
    const res = await agent.get('/api/gym?paged=1&limit=2&page=2');
    expect(res.body).toMatchObject({ total: 3, page: 2 });
    expect(names(res)).toEqual(['Gym C']);
    expect((await agent.get('/api/gym?limit=51&paged=1')).status).toBe(400);
    expect(Array.isArray((await agent.get('/api/gym')).body)).toBe(true);
  });

  it('keeps gyms inside the radius, nearest first', async () => {
    await seedGym({ name: 'Far', lat: 19.2, lng: 72.9 }); // ~25 km from origin
    await seedGym({ name: 'Near', lat: 19.0, lng: 72.85 });
    await seedGym({ name: 'Elsewhere', lat: 28.6, lng: 77.2 });
    await seedGym({ name: 'Unlocated' });
    const res = await agent.get('/api/gym?paged=1&lat=19.0&lng=72.85&radiusKm=50&sort=distance');
    expect(names(res)).toEqual(['Near', 'Far']);
    expect(res.body.items[0].distanceKm).toBe(0);
    expect(res.body.items[1].distanceKm).toBeGreaterThan(20);
    expect(names(await agent.get('/api/gym?paged=1&lat=19.0&lng=72.85&radiusKm=5'))).toEqual(['Near']);
  });
});
