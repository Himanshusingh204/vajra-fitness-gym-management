import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { startOfDayIn, startOfMonthIn, endOfMonthIn } from '../src/utils/time';
import { hashToken } from '../src/utils/tokens';
import { seedAdmin, seedMember, seedSuperAdmin, seedPlan, registerMember, login, authGet, authPost, authPut, authDelete, uniq, PASSWORD } from './helpers';

const agent = request(app);
const DAY = 24 * 60 * 60 * 1000;
const tokenFor = async (email: string) => (await login(email, PASSWORD)).body.token as string;
const statuses = (results: { status: number }[]) => results.map((r) => r.status).sort();

afterEach(() => {
  vi.restoreAllMocks();
});

const seedActiveMember = async (gymId: string) => {
  const member = await seedMember(gymId);
  await prisma.membership.create({
    data: {
      memberId: member.details.id, gymId, status: 'ACTIVE',
      startDate: new Date(Date.now() - DAY), endDate: new Date(Date.now() + DAY),
      originalAmount: 1000, finalAmount: 1000,
    },
  });
  return member;
};

describe('Gym-local day boundaries', () => {
  it('starts the day at midnight IST, not server midnight', () => {
    // 01:30 IST on 26 Oct is still 25 Oct in UTC.
    expect(startOfDayIn(new Date('2026-10-25T20:00:00Z')).toISOString()).toBe('2026-10-25T18:30:00.000Z');
    expect(startOfDayIn(new Date('2026-10-25T18:29:59Z')).toISOString()).toBe('2026-10-24T18:30:00.000Z');
    expect(startOfDayIn(new Date('2026-10-26')).toISOString()).toBe('2026-10-25T18:30:00.000Z');
    expect(startOfDayIn(new Date('2026-10-25T12:00:00Z'), 'America/New_York').toISOString()).toBe('2026-10-25T04:00:00.000Z');
  });

  it('starts the month at midnight IST on the 1st', () => {
    // 01:00 IST on 1 Nov is still October in UTC.
    expect(startOfMonthIn(new Date('2026-10-31T19:30:00Z')).toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(startOfMonthIn(new Date('2026-01-15T00:00:00Z'), 1).toISOString()).toBe('2025-11-30T18:30:00.000Z');
    expect(endOfMonthIn(new Date('2026-03-10T00:00:00Z')).toISOString()).toBe('2026-03-31T18:29:59.999Z');
  });

  it('counts an expense from the first IST hours of the month in this month', async () => {
    const { user, gym } = await seedAdmin();
    const monthStart = startOfMonthIn(new Date());
    await prisma.expense.createMany({
      data: [
        { gymId: gym.id, category: 'RENT', description: 'This month', amount: 100, date: new Date(monthStart.getTime() + 60_000) },
        { gymId: gym.id, category: 'RENT', description: 'Last month', amount: 7, date: new Date(monthStart.getTime() - 60_000) },
      ],
    });
    const res = await authGet(await tokenFor(user.email), `/api/expenses/gym/${gym.id}/summary`);
    expect(Number(res.body.monthTotal)).toBe(100);
  });
});

describe('Check-in races', () => {
  it('a burst of self check-ins records exactly one', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedActiveMember(gym.id);
    const token = await tokenFor(user.email);

    const results = await Promise.all(Array.from({ length: 5 }, () => authPost(token, '/api/attendance/my/check-in', {})));
    expect(statuses(results)).toEqual([201, 409, 409, 409, 409]);
    expect(await prisma.attendance.count({ where: { gymId: gym.id } })).toBe(1);
  });

  it('front desk and member checking in at once still records one', async () => {
    const { user: owner, gym } = await seedAdmin();
    const { user, details } = await seedActiveMember(gym.id);
    const [ownerToken, memberToken] = await Promise.all([tokenFor(owner.email), tokenFor(user.email)]);

    const results = await Promise.all([
      authPost(ownerToken, `/api/attendance/gym/${gym.id}`, { memberId: details.id }),
      authPost(memberToken, '/api/attendance/my/check-in', {}),
      authPost(ownerToken, `/api/attendance/gym/${gym.id}`, { memberId: details.id }),
    ]);
    expect(statuses(results)).toEqual([201, 409, 409]);
  });
});

describe('Signup with a referral code', () => {
  it('still succeeds when recording the referral fails', async () => {
    const { gym } = await seedAdmin();
    const referrer = await seedMember(gym.id);
    await prisma.memberDetails.update({ where: { id: referrer.details.id }, data: { referralCode: 'VFTEST01' } });
    vi.spyOn(prisma.referral, 'create').mockRejectedValueOnce(new Error('db down'));

    const res = await registerMember({ gymId: gym.id, referralCode: 'VFTEST01' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });

  it('hands out a random VF code', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedMember(gym.id);
    const res = await authGet(await tokenFor(user.email), '/api/referrals/me');
    expect(res.body.code).toMatch(/^VF[0-9A-F]{8}$/);
  });
});

describe('One-time tokens', () => {
  it('invalidates other reset links when one is used', async () => {
    const { user } = await seedMember((await seedAdmin()).gym.id);
    const first = `first-${Date.now()}-${'x'.repeat(40)}`;
    const second = `second-${Date.now()}-${'y'.repeat(40)}`;
    await prisma.passwordResetToken.createMany({ data: [first, second].map((token) => ({ tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 60_000) })) });
    const results = await Promise.all([first, second].map((token) => agent.post('/api/auth/reset-password').send({ token, newPassword: 'NewPassw0rd!1' })));
    expect(statuses(results)).toEqual([200, 400]);
  });

  it('a reset token works once even when submitted twice at the same moment', async () => {
    const { user } = await seedMember((await seedAdmin()).gym.id);
    const token = 'r'.repeat(40) + Date.now();
    await prisma.passwordResetToken.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 60_000) } });

    const results = await Promise.all([
      agent.post('/api/auth/reset-password').send({ token, newPassword: 'NewPassw0rd!1' }),
      agent.post('/api/auth/reset-password').send({ token, newPassword: 'OtherPassw0rd!2' }),
    ]);
    expect(statuses(results)).toEqual([200, 400]);
  });

  it('an activation token works once even when submitted twice at the same moment', async () => {
    const { user } = await seedMember((await seedAdmin()).gym.id);
    const token = 'a'.repeat(40) + Date.now();
    await prisma.activationToken.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 60_000) } });

    const results = await Promise.all([
      agent.post('/api/auth/activate').send({ token, password: 'NewPassw0rd!1' }),
      agent.post('/api/auth/activate').send({ token, password: 'OtherPassw0rd!2' }),
    ]);
    expect(statuses(results)).toEqual([200, 400]);
  });
});

describe('Website request races', () => {
  it('two quick submits leave one pending request', async () => {
    const { user, gym } = await seedAdmin();
    const token = await tokenFor(user.email);
    const slug = `race-${Date.now().toString(36)}`;

    const results = await Promise.all([
      authPost(token, '/api/website-requests', { desiredSlug: `${slug}-a` }),
      authPost(token, '/api/website-requests', { desiredSlug: `${slug}-b` }),
    ]);
    expect(statuses(results)).toEqual([201, 409]);
    expect(await prisma.gymWebsiteRequest.count({ where: { gymId: gym.id, status: 'PENDING' } })).toBe(1);
  });
});

describe('Inventory sales', () => {
  it('two tills selling the last unit sell it once', async () => {
    const { user, gym } = await seedAdmin();
    const token = await tokenFor(user.email);
    const product = await prisma.product.create({ data: { gymId: gym.id, name: 'Shaker', sellingPrice: 300, stock: 1 } });

    const sale = { items: [{ productId: product.id, quantity: 1 }] };
    const results = await Promise.all([
      authPost(token, `/api/inventory/gym/${gym.id}/sales`, sale),
      authPost(token, `/api/inventory/gym/${gym.id}/sales`, sale),
    ]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(0);
  });
});

describe('Input validation', () => {
  it('rejects unknown referral statuses and malformed payslips', async () => {
    const { user, gym } = await seedAdmin();
    const token = await tokenFor(user.email);
    const referral = await prisma.referral.create({ data: { gymId: gym.id, referrerUserId: user.id, referralCode: 'X' } });

    expect((await authPut(token, `/api/referrals/${referral.id}`, { status: 'HACKED' })).status).toBe(400);
    expect((await authPost(token, `/api/payslips/gym/${gym.id}`, { userId: user.id, month: 13, year: 2026, basicSalary: 1000 })).status).toBe(400);
    expect((await authPost(token, `/api/payslips/gym/${gym.id}`, { userId: user.id, month: 1, year: 2026, basicSalary: -5 })).status).toBe(400);
  });

  it('only accepts http(s) image links', async () => {
    const { user } = await seedAdmin();
    const token = await tokenFor(user.email);
    expect((await authPut(token, '/api/gym/my-branch', { logoUrl: 'javascript:alert(1)' })).status).toBe(400);
    expect((await authPut(token, '/api/gym/my-branch', { logoUrl: 'https://cdn.example.com/logo.png' })).status).toBe(200);
  });

  it('validates the super admin gym edit body', async () => {
    const { gym } = await seedAdmin();
    const admin = await seedSuperAdmin();
    const token = await tokenFor(admin.email);
    expect((await authPut(token, `/api/admin/gyms/${gym.id}`, { name: 'x'.repeat(500) })).status).toBe(400);
  });
});

describe('Tenant isolation', () => {
  it('a gym admin cannot attach another gym\'s plan to a new member', async () => {
    const { user } = await seedAdmin();
    const { gym: otherGym } = await seedAdmin();
    const otherPlan = await seedPlan(otherGym.id);
    const ownGym = await prisma.gym.findFirstOrThrow({ where: { ownerId: user.id } });

    const res = await authPost(await tokenFor(user.email), `/api/members/gym/${ownGym.id}`, {
      username: 'New Member', email: uniq('m'), planId: otherPlan.id,
    });
    expect(res.status).toBe(400);
  });
});

describe('Class waitlist', () => {
  it('cancelling a waitlist entry does not promote anyone past capacity', async () => {
    const { gym } = await seedAdmin();
    const gymClass = await prisma.gymClass.create({ data: { gymId: gym.id, name: 'Spin', capacity: 1 } });
    const [a, b, c] = await Promise.all([seedMember(gym.id), seedMember(gym.id), seedMember(gym.id)]);
    await prisma.classBooking.create({ data: { classId: gymClass.id, memberId: a.details.id, status: 'BOOKED' } });
    const waitB = await prisma.classBooking.create({ data: { classId: gymClass.id, memberId: b.details.id, status: 'WAITLISTED' } });
    await prisma.classBooking.create({ data: { classId: gymClass.id, memberId: c.details.id, status: 'WAITLISTED' } });

    expect((await authDelete(await tokenFor(b.user.email), `/api/classes/bookings/${waitB.id}`)).status).toBe(200);
    expect(await prisma.classBooking.count({ where: { classId: gymClass.id, status: 'BOOKED' } })).toBe(1);
  });
});

describe('Class capacity', () => {
  it('a burst of bookings fills the class and waitlists the rest', async () => {
    const { gym } = await seedAdmin();
    const gymClass = await prisma.gymClass.create({ data: { gymId: gym.id, name: 'Spin', capacity: 2 } });
    const members = await Promise.all(Array.from({ length: 6 }, () => seedMember(gym.id)));
    const tokens = await Promise.all(members.map((m) => tokenFor(m.user.email)));

    const results = await Promise.all(tokens.map((t) => authPost(t, `/api/classes/${gymClass.id}/book`, {})));
    expect(statuses(results)).toEqual([201, 201, 201, 201, 201, 201]);
    expect(await prisma.classBooking.count({ where: { classId: gymClass.id, status: 'BOOKED' } })).toBe(2);
    expect(await prisma.classBooking.count({ where: { classId: gymClass.id, status: 'WAITLISTED' } })).toBe(4);
  });
});

describe('Deleting accounts with money records', () => {
  const seedOrder = (memberUserId: string, gymId: string) =>
    prisma.order.create({
      data: {
        memberUserId, gymId, idempotencyKey: `k${Date.now()}`, planSnapshot: { name: 'Monthly' }, status: 'PAID',
        basePaise: 100000, gstPaise: 0, totalPaise: 100000, commissionBps: 1000, commissionPaise: 10000, commissionGstPaise: 1800, gymNetPaise: 88200,
      },
    });

  it('suspends a gym with orders instead of deleting it, and hides it', async () => {
    const { user: owner, gym } = await seedAdmin();
    const { user: member } = await seedMember(gym.id);
    await seedOrder(member.id, gym.id);
    const admin = await seedSuperAdmin();

    const res = await authDelete(await tokenFor(admin.email), `/api/admin/gyms/${gym.id}`);
    expect(res.status).toBe(200);
    expect(await prisma.gym.findUnique({ where: { id: gym.id } })).toMatchObject({ status: 'SUSPENDED', isApproved: false });
    expect(await prisma.order.count({ where: { gymId: gym.id } })).toBe(1);
    expect(await prisma.user.findUnique({ where: { id: owner.id } })).toMatchObject({ isActive: false, tokenVersion: 1 });

    expect((await agent.get(`/api/public/gyms/${gym.id}`)).status).toBe(404);
    const outsider = await seedMember((await seedAdmin()).gym.id);
    expect((await authPost(await tokenFor(outsider.user.email), '/api/members/enroll', { gymId: gym.id })).status).toBe(404);
  });

  it('still hard-deletes a gym with no money records', async () => {
    const { gym } = await seedAdmin();
    const admin = await seedSuperAdmin();
    expect((await authDelete(await tokenFor(admin.email), `/api/admin/gyms/${gym.id}`)).status).toBe(200);
    expect(await prisma.gym.findUnique({ where: { id: gym.id } })).toBeNull();
  });

  it('deactivates a user with fees instead of deleting them', async () => {
    const { gym } = await seedAdmin();
    const { user, details } = await seedMember(gym.id);
    await prisma.fee.create({ data: { memberId: details.id, gymId: gym.id, amount: 500, dueDate: new Date() } });
    const memberToken = await tokenFor(user.email);
    const admin = await seedSuperAdmin();

    expect((await authDelete(await tokenFor(admin.email), `/api/admin/users/${user.id}`)).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({ isActive: false, tokenVersion: 1 });
    expect(await prisma.fee.count({ where: { memberId: details.id } })).toBe(1);
    expect((await authGet(memberToken, '/api/members/my-profile')).status).toBe(403);
  });

  it('still hard-deletes a user with no money records', async () => {
    const { user } = await seedMember((await seedAdmin()).gym.id);
    const admin = await seedSuperAdmin();
    expect((await authDelete(await tokenFor(admin.email), `/api/admin/users/${user.id}`)).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });
});

describe('Admin audit trail', () => {
  it('records CMS changes', async () => {
    const admin = await seedSuperAdmin();
    const res = await authPost(await tokenFor(admin.email), '/api/admin/cms/faqs', { question: 'Open on Sunday?', answer: 'Yes, 6am to noon.' });
    expect(res.status).toBe(201);
    expect(await prisma.auditLog.count({ where: { action: 'FAQ_CREATED', entityId: res.body.id, userId: admin.id } })).toBe(1);
  });
});

describe('Metrics endpoint', () => {
  it('is closed in production when no token is configured', async () => {
    const env = process.env.NODE_ENV;
    const token = process.env.METRICS_TOKEN;
    process.env.NODE_ENV = 'production';
    delete process.env.METRICS_TOKEN;
    try {
      expect((await agent.get('/metrics')).status).toBe(401);
    } finally {
      process.env.NODE_ENV = env;
      if (token !== undefined) process.env.METRICS_TOKEN = token;
    }
  });
});
