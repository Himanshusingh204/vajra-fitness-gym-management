import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { startAutomaticTrial, processExpiredSubscriptions, TRIAL_DAYS } from '../src/services/subscription.service';
import { clearSubscriptionCache } from '../src/middlewares/subscription.middleware';
import { seedAdmin, seedMember, seedSuperAdmin, login, authGet, authPost } from './helpers';

const DAY = 24 * 60 * 60 * 1000;

const seedProfessionalPlan = () =>
  prisma.saaSPlan.create({
    data: {
      name: 'Professional',
      code: 'PROFESSIONAL',
      monthlyPrice: 2999,
      maxMembers: 500,
      features: JSON.stringify(['MEMBER_MANAGEMENT', 'ATTENDANCE']),
    },
  });

const tokenFor = (email: string) => login(email).then((r) => r.body.token as string);

// Moves a gym's trial so it ended `daysAgo` days ago, as if no scheduler ran.
const endTrial = async (gymId: string, daysAgo: number) => {
  const end = new Date(Date.now() - daysAgo * DAY);
  await prisma.gymSubscription.updateMany({
    where: { gymId, status: 'TRIAL' },
    data: { startDate: new Date(end.getTime() - TRIAL_DAYS * DAY), endDate: end, trialEndsAt: end },
  });
  clearSubscriptionCache(gymId);
};

const addMember = (token: string, gymId: string) =>
  authPost(token, `/api/members/gym/${gymId}`, {
    username: 'Lifecycle Member',
    email: `life${Date.now()}${Math.floor(Math.random() * 1e6)}@test.local`,
    status: 'ACTIVE',
  });

describe('Plan changes are Super Admin only', () => {
  it('rejects a gym admin on upgrade and downgrade', async () => {
    const plan = await seedProfessionalPlan();
    const { user, gym } = await seedAdmin();
    const token = await tokenFor(user.email);

    const up = await authPost(token, '/api/saas/upgrade', { planId: plan.id, gymId: gym.id });
    expect(up.status).toBe(403);
    const down = await authPost(token, '/api/saas/downgrade', { planId: plan.id, gymId: gym.id });
    expect(down.status).toBe(403);

    const rows = await prisma.gymSubscription.count({ where: { gymId: gym.id, planId: plan.id } });
    expect(rows).toBe(0);
  });

  it('lets a Super Admin upgrade and downgrade a gym', async () => {
    const plan = await seedProfessionalPlan();
    const { gym } = await seedAdmin();
    const superAdmin = await seedSuperAdmin();
    const token = await tokenFor(superAdmin.email);

    const up = await authPost(token, '/api/saas/upgrade', { planId: plan.id, gymId: gym.id });
    expect(up.status).toBe(200);
    expect(up.body.status).toBe('ACTIVE');

    const down = await authPost(token, '/api/saas/downgrade', { planId: plan.id, gymId: gym.id });
    expect(down.status).toBe(200);
  });

  it('requires a gymId from the Super Admin', async () => {
    const plan = await seedProfessionalPlan();
    const superAdmin = await seedSuperAdmin();
    const token = await tokenFor(superAdmin.email);
    const res = await authPost(token, '/api/saas/upgrade', { planId: plan.id });
    expect(res.status).toBe(400);
  });

  it('no longer offers a self-serve trial endpoint', async () => {
    const plan = await seedProfessionalPlan();
    const { user, gym } = await seedAdmin({ approved: false, subscription: false });
    const token = await tokenFor(user.email);

    const res = await authPost(token, '/api/saas/trial', { planId: plan.id, trialDays: 90 });
    expect(res.status).toBe(404);

    const after = await prisma.gym.findUniqueOrThrow({ where: { id: gym.id } });
    expect(after.isApproved).toBe(false);
    expect(await prisma.gymSubscription.count({ where: { gymId: gym.id } })).toBe(0);
  });
});

describe('Automatic trial', () => {
  it('creates one 14-day Professional trial without approving the gym', async () => {
    const plan = await seedProfessionalPlan();
    const { user, gym } = await seedAdmin({ approved: false, subscription: false });
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    await startAutomaticTrial(gym.id);

    const subs = await prisma.gymSubscription.findMany({ where: { gymId: gym.id } });
    expect(subs).toHaveLength(1);
    const trial = subs[0]!;
    expect(trial.status).toBe('TRIAL');
    expect(trial.planId).toBe(plan.id);
    expect(trial.amount.toNumber()).toBe(0);
    const length = trial.trialEndsAt!.getTime() - trial.startDate.getTime();
    expect(Math.round(length / DAY)).toBe(14);

    const gymAfter = await prisma.gym.findUniqueOrThrow({ where: { id: gym.id } });
    expect(gymAfter.isApproved).toBe(false);
    const ownerAfter = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(ownerAfter.isActive).toBe(false);
  });

  it('refuses a second trial for the same gym', async () => {
    await seedProfessionalPlan();
    const { gym } = await seedAdmin({ subscription: false });

    await startAutomaticTrial(gym.id);
    await startAutomaticTrial(gym.id);
    expect(await prisma.gymSubscription.count({ where: { gymId: gym.id } })).toBe(1);
  });

  it('does not start a trial for a gym that already has any subscription row', async () => {
    await seedProfessionalPlan();
    const { gym } = await seedAdmin();

    await startAutomaticTrial(gym.id);
    expect(await prisma.gymSubscription.count({ where: { gymId: gym.id, status: 'TRIAL' } })).toBe(0);
  });

  it('returns without throwing when the Professional plan is missing', async () => {
    const { gym } = await seedAdmin({ subscription: false });
    await expect(startAutomaticTrial(gym.id)).resolves.toBeUndefined();
    expect(await prisma.gymSubscription.count({ where: { gymId: gym.id } })).toBe(0);
  });

  it('gives full access during the trial', async () => {
    await seedProfessionalPlan();
    const { user, gym } = await seedAdmin({ approved: false, subscription: false });
    await startAutomaticTrial(gym.id);
    const token = await tokenFor(user.email);

    const res = await addMember(token, gym.id);
    expect(res.status).toBe(201);
  });
});

describe('Live expiry without the scheduler', () => {
  it('keeps writes open in the 3-day grace after a trial ends', async () => {
    await seedProfessionalPlan();
    const { user, gym } = await seedAdmin({ subscription: false });
    await startAutomaticTrial(gym.id);
    await endTrial(gym.id, 1);
    const token = await tokenFor(user.email);

    const res = await addMember(token, gym.id);
    expect(res.status).toBe(201);

    const summary = await authGet(token, '/api/saas/my-subscription');
    expect(summary.status).toBe(200);
    expect(summary.body.status).toBe('GRACE_PERIOD');
    expect(summary.body.isReadonly).toBe(false);
  });

  it('makes the gym read-only once the trial grace has passed', async () => {
    await seedProfessionalPlan();
    const { user, gym } = await seedAdmin({ subscription: false });
    await startAutomaticTrial(gym.id);
    await endTrial(gym.id, 4);
    const token = await tokenFor(user.email);

    const write = await addMember(token, gym.id);
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe('SUBSCRIPTION_READONLY');

    const read = await authGet(token, `/api/members/gym/${gym.id}`);
    expect(read.status).toBe(200);

    const summary = await authGet(token, '/api/saas/my-subscription');
    expect(summary.body.status).toBe('EXPIRED');
    expect(summary.body.isReadonly).toBe(true);
  });

  it('applies the same grace to a paid plan with no gracePeriodEnd', async () => {
    const plan = await seedProfessionalPlan();
    const { user: ownerA, gym: gymA } = await seedAdmin({ subscription: false });
    const { user: ownerB, gym: gymB } = await seedAdmin({ subscription: false });
    const paid = (gymId: string, endedDaysAgo: number) =>
      prisma.gymSubscription.create({
        data: {
          gymId,
          planId: plan.id,
          status: 'ACTIVE',
          amount: 2999,
          startDate: new Date(Date.now() - (30 + endedDaysAgo) * DAY),
          endDate: new Date(Date.now() - endedDaysAgo * DAY),
        },
      });
    await paid(gymA.id, 2);
    await paid(gymB.id, 5);

    expect((await addMember(await tokenFor(ownerA.email), gymA.id)).status).toBe(201);

    const blocked = await addMember(await tokenFor(ownerB.email), gymB.id);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('SUBSCRIPTION_READONLY');
  });

  it('blocks member writes too once the gym is read-only', async () => {
    await seedProfessionalPlan();
    const { gym } = await seedAdmin({ subscription: false });
    await startAutomaticTrial(gym.id);
    await endTrial(gym.id, 10);

    const { user: member } = await seedMember(gym.id);
    const token = await tokenFor(member.email);

    const write = await authPost(token, '/api/progress', { weight: 70 });
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe('SUBSCRIPTION_READONLY');
    expect((await authGet(token, '/api/progress/my')).status).toBe(200);
  });
});

describe('Unpaid checkouts do not grant access', () => {
  it('keeps an expired trial read-only after a cash checkout until it is activated', async () => {
    const plan = await seedProfessionalPlan();
    const { user, gym } = await seedAdmin({ subscription: false });
    await startAutomaticTrial(gym.id);
    await endTrial(gym.id, 6);
    const token = await tokenFor(user.email);

    const checkout = await authPost(token, '/api/saas/checkout', { planId: plan.id, paymentMethod: 'CASH' });
    expect(checkout.status).toBe(201);
    expect(checkout.body.subscription.status).toBe('PENDING');

    const blocked = await addMember(token, gym.id);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('SUBSCRIPTION_READONLY');

    const summary = await authGet(token, '/api/saas/my-subscription');
    expect(summary.body.status).toBe('EXPIRED');
    expect(summary.body.hasPendingCheckout).toBe(true);

    const superAdmin = await seedSuperAdmin();
    const adminToken = await tokenFor(superAdmin.email);
    const activate = await request(app)
      .patch(`/api/saas/subscriptions/${checkout.body.subscription.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });
    expect(activate.status).toBe(200);

    expect((await addMember(token, gym.id)).status).toBe(201);
  });

  it('ignores a PAST_DUE checkout that was never paid', async () => {
    const plan = await seedProfessionalPlan();
    const { user, gym } = await seedAdmin({ subscription: false });
    await prisma.gymSubscription.create({
      data: {
        gymId: gym.id,
        planId: plan.id,
        status: 'PAST_DUE',
        amount: 2999,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * DAY),
        razorpayOrderId: 'order_unpaid123',
      },
    });

    const res = await addMember(await tokenFor(user.email), gym.id);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SUBSCRIPTION_READONLY');
  });

  it('lets a gym on a trial buy a plan, but not open a second checkout', async () => {
    const plan = await seedProfessionalPlan();
    const { user, gym } = await seedAdmin({ subscription: false });
    await startAutomaticTrial(gym.id);
    const token = await tokenFor(user.email);

    const first = await authPost(token, '/api/saas/checkout', { planId: plan.id, paymentMethod: 'CASH' });
    expect(first.status).toBe(201);
    const second = await authPost(token, '/api/saas/checkout', { planId: plan.id, paymentMethod: 'CASH' });
    expect(second.status).toBe(409);
  });
});

describe('No subscription row', () => {
  it('reports a no-plan, read-only summary', async () => {
    const { user } = await seedAdmin({ subscription: false });
    const res = await authGet(await tokenFor(user.email), '/api/saas/my-subscription');
    expect(res.status).toBe(200);
    expect(res.body.hasSubscription).toBe(false);
    expect(res.body.status).toBe('NONE');
    expect(res.body.isReadonly).toBe(true);
  });
});

describe('Scheduler', () => {
  it('moves stored statuses to match the live rules', async () => {
    const plan = await seedProfessionalPlan();
    const { gym } = await seedAdmin({ subscription: false });
    const row = (status: string, endedDaysAgo: number, trial = false) => {
      const end = new Date(Date.now() - endedDaysAgo * DAY);
      return prisma.gymSubscription.create({
        data: {
          gymId: gym.id,
          planId: plan.id,
          status,
          amount: 0,
          startDate: new Date(end.getTime() - 30 * DAY),
          endDate: end,
          trialEndsAt: trial ? end : null,
        },
      });
    };
    const trialInGrace = await row('TRIAL', 1, true);
    const trialOver = await row('TRIAL', 5, true);
    const paidInGrace = await row('ACTIVE', 2);
    const paidOver = await row('ACTIVE', 4);
    const graceOver = await row('GRACE_PERIOD', 4);
    const running = await row('ACTIVE', -10);

    await processExpiredSubscriptions();

    const status = async (id: string) => (await prisma.gymSubscription.findUniqueOrThrow({ where: { id } })).status;
    expect(await status(trialInGrace.id)).toBe('GRACE_PERIOD');
    expect(await status(trialOver.id)).toBe('EXPIRED');
    expect(await status(paidInGrace.id)).toBe('GRACE_PERIOD');
    expect(await status(paidOver.id)).toBe('EXPIRED');
    expect(await status(graceOver.id)).toBe('EXPIRED');
    expect(await status(running.id)).toBe('ACTIVE');
  });
});
