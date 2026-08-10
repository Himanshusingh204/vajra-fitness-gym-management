import { describe, it, expect } from 'vitest';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedMember, seedPlan, login, authPost, authGet } from './helpers';
import { syncExpiredMemberships, deriveMembershipStatus } from '../src/services/membership.service';
import { runExpiryReminders, runFeeReminders, runAllJobs } from '../src/jobs/scheduler';

describe('Membership lifecycle', () => {
  it('creates a membership, activates the member and generates a fee', async () => {
    const { user: admin, gym } = await seedAdmin();
    const { details: member } = await seedMember(gym.id, { status: 'PENDING' });
    const plan = await seedPlan(gym.id, { price: 1500, duration: 30 });
    const token = await login(admin.email).then((r) => r.body.token as string);

    const res = await authPost(token, `/api/memberships/gym/${gym.id}`, {
      memberId: member.id,
      planId: plan.id,
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
    });
    expect(res.status).toBe(201);
    expect(res.body.lifecycleStatus).toBe('ACTIVE');
    expect(res.body.finalAmount).toBe(1500);

    const updated = await prisma.memberDetails.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.status).toBe('ACTIVE');
    expect(updated.planId).toBe(plan.id);

    const fee = await prisma.fee.findFirstOrThrow({ where: { membershipId: res.body.id } });
    expect(fee.amount.toNumber()).toBe(1500);
    expect(fee.status).toBe('PAID');
  });

  it('rejects creating a membership for a member of a different gym', async () => {
    const { gym: gymA } = await seedAdmin();
    const { gym: gymB, user: adminB } = await seedAdmin();
    const { details: memberA } = await seedMember(gymA.id);
    const planB = await seedPlan(gymB.id);

    const token = await login(adminB.email).then((r) => r.body.token as string);
    const res = await authPost(token, `/api/memberships/gym/${gymB.id}`, {
      memberId: memberA.id,
      planId: planB.id,
    });
    expect(res.status).not.toBe(201);
  });

  it('renews a membership from the later of now or previous expiry', async () => {
    const { user: admin, gym } = await seedAdmin();
    const { details: member } = await seedMember(gym.id);
    const plan = await seedPlan(gym.id, { duration: 30 });
    const token = await login(admin.email).then((r) => r.body.token as string);

    const created = await authPost(token, `/api/memberships/gym/${gym.id}`, {
      memberId: member.id,
      planId: plan.id,
      paymentStatus: 'PAID',
    });
    expect(created.status).toBe(201);

    const renewed = await authPost(token, `/api/memberships/gym/${gym.id}/renew`, {
      membershipId: created.body.id,
      planId: plan.id,
      paymentStatus: 'PENDING',
    });
    expect(renewed.status).toBe(201);
    expect(renewed.body.isRenewal).toBe(true);
    expect(renewed.body.previousMembershipId).toBe(created.body.id);
    expect(new Date(renewed.body.startDate).getTime()).toBeGreaterThanOrEqual(new Date(created.body.endDate).getTime());
  });

  it('syncs past memberships to EXPIRED and derives statuses', async () => {
    const { gym } = await seedAdmin();
    const { details: member } = await seedMember(gym.id);

    const past = await prisma.membership.create({
      data: {
        memberId: member.id,
        gymId: gym.id,
        startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        originalAmount: 1000,
        discount: 0,
        finalAmount: 1000,
        paymentStatus: 'PAID',
        status: 'ACTIVE',
      },
    });

    const count = await syncExpiredMemberships();
    expect(count).toBeGreaterThanOrEqual(1);

    const updated = await prisma.membership.findUniqueOrThrow({ where: { id: past.id } });
    expect(updated.status).toBe('EXPIRED');
    expect(deriveMembershipStatus(updated)).toBe('EXPIRED');
  });

  it('derives EXPIRING_SOON for memberships ending within a week', () => {
    const base = { status: 'ACTIVE', startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) };
    const expiring = deriveMembershipStatus({ ...base, endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) });
    expect(expiring).toBe('EXPIRING_SOON');

    const active = deriveMembershipStatus({ ...base, endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
    expect(active).toBe('ACTIVE');

    const expired = deriveMembershipStatus({ ...base, endDate: new Date(Date.now() - 1) });
    expect(expired).toBe('EXPIRED');
  });

  it('sends one expiry reminder per membership (idempotent jobs)', async () => {
    const { gym } = await seedAdmin();
    const { user: memberUser } = await seedMember(gym.id);

    await prisma.membership.create({
      data: {
        memberId: (await prisma.memberDetails.findFirstOrThrow({ where: { userId: memberUser.id } })).id,
        gymId: gym.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        originalAmount: 1000,
        discount: 0,
        finalAmount: 1000,
        paymentStatus: 'PAID',
        status: 'ACTIVE',
      },
    });

    const first = await runExpiryReminders();
    expect(first).toBe(1);

    const second = await runExpiryReminders();
    expect(second).toBe(0);

    const notifCount = await prisma.notification.count({ where: { userId: memberUser.id } });
    expect(notifCount).toBe(1);
  });

  it('runs the full job suite without errors', async () => {
    const result = await runAllJobs();
    expect(result).toHaveProperty('expired');
    expect(result).toHaveProperty('expiryNudges');
    expect(result).toHaveProperty('feeNudges');
  });

  it('lets a member list their own memberships', async () => {
    const { gym } = await seedAdmin();
    const { user: member } = await seedMember(gym.id);
    const token = await login(member.email).then((r) => r.body.token as string);

    const res = await authGet(token, '/api/memberships/my');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
