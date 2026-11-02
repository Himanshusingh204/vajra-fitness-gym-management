import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedMember, login, authGet, authPost, PASSWORD } from './helpers';

const memberToken = async (email: string) => (await login(email, PASSWORD)).body.token;

describe('Member self check-in', () => {
  it('needs an active membership and allows one check-in a day', async () => {
    const { gym } = await seedAdmin();
    const { user, details } = await seedMember(gym.id);
    const token = await memberToken(user.email);

    expect((await authPost(token, '/api/attendance/my/check-in', {})).status).toBe(403);

    const now = Date.now();
    await prisma.membership.create({
      data: {
        memberId: details.id, gymId: gym.id, status: 'ACTIVE',
        startDate: new Date(now - 864e5), endDate: new Date(now + 864e5),
        originalAmount: 1000, finalAmount: 1000,
      },
    });
    expect((await authPost(token, '/api/attendance/my/check-in', {})).status).toBe(201);
    expect((await authPost(token, '/api/attendance/my/check-in', {})).status).toBe(409);
  });
});

describe('Member referrals', () => {
  it('gives a stable code and lists only their own referrals', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedMember(gym.id);
    const token = await memberToken(user.email);
    await prisma.referral.create({ data: { gymId: gym.id, referrerUserId: user.id, referralCode: 'X' } });

    const first = await authGet(token, '/api/referrals/me');
    const second = await authGet(token, '/api/referrals/me');
    expect(first.status).toBe(200);
    expect(first.body.code).toBe(second.body.code);
    expect(first.body.referrals).toHaveLength(1);
  });
});

describe('Public gym site', () => {
  it('serves approved gyms by slug without private data', async () => {
    const { gym } = await seedAdmin();
    const slug = `site-${Date.now().toString(36)}`;
    await prisma.gym.update({ where: { id: gym.id }, data: { subdomain: slug } });

    const res = await request(app).get(`/api/public/sites/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Peak Club');
    expect(JSON.stringify(res.body)).not.toContain('9999999999');
    expect(res.body.gstNumber).toBeUndefined();
    expect(res.body.owner).toBeUndefined();
  });

  it('404s for unapproved gyms and unknown slugs', async () => {
    const { gym } = await seedAdmin({ approved: false });
    const slug = `draft-${Date.now().toString(36)}`;
    await prisma.gym.update({ where: { id: gym.id }, data: { subdomain: slug } });

    expect((await request(app).get(`/api/public/sites/${slug}`)).status).toBe(404);
    expect((await request(app).get('/api/public/sites/nope-nope')).status).toBe(404);
  });
});
