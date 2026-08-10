import { describe, it, expect } from 'vitest';
import { seedAdmin, seedMember, seedSubscription, seedPlan, login, authPost } from './helpers';
import { DEFAULT_TRIAL } from '../src/services/entitlements.service';

describe('SaaS entitlement limits', () => {
  it('blocks adding a member beyond the plan cap (402)', async () => {
    const { user: admin, gym } = await seedAdmin();
    await seedSubscription(gym.id, 2, 5, 5);
    const token = await login(admin.email).then((r) => r.body.token as string);

    await authPost(token, `/api/members/gym/${gym.id}`, { username: 'Member One', email: `m1@test.local`, status: 'ACTIVE' });
    await authPost(token, `/api/members/gym/${gym.id}`, { username: 'Member Two', email: `m2@test.local`, status: 'ACTIVE' });

    const res = await authPost(token, `/api/members/gym/${gym.id}`, { username: 'Member Three', email: `m3@test.local`, status: 'ACTIVE' });
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/limit/i);
  });

  it('allows members up to the plan cap', async () => {
    const { user: admin, gym } = await seedAdmin();
    await seedSubscription(gym.id, 3, 5, 5);
    const token = await login(admin.email).then((r) => r.body.token as string);

    const res = await authPost(token, `/api/members/gym/${gym.id}`, { username: 'Member One', email: `ok@test.local`, status: 'ACTIVE' });
    expect(res.status).toBe(201);
  });

  it('bounds a gym with no subscription to the default trial member cap', async () => {
    const { user: admin, gym } = await seedAdmin();
    const token = await login(admin.email).then((r) => r.body.token as string);

    for (let i = 0; i < DEFAULT_TRIAL.maxMembers; i += 1) {
      const res = await authPost(token, `/api/members/gym/${gym.id}`, { username: `Trial Member ${i}`, email: `trial${i}@test.local`, status: 'ACTIVE' });
      expect(res.status).toBe(201);
    }

    const over = await authPost(token, `/api/members/gym/${gym.id}`, {
      username: 'Over Trial Cap',
      email: `overcap@test.local`,
      status: 'ACTIVE',
    });
    expect(over.status).toBe(402);
    expect(over.body.error).toMatch(/limit/i);
  });

  it('blocks adding a trainer beyond the plan cap', async () => {
    const { user: admin, gym } = await seedAdmin();
    await seedSubscription(gym.id, 100, 1, 5);
    const token = await login(admin.email).then((r) => r.body.token as string);

    const first = await authPost(token, `/api/staff/gym/${gym.id}`, {
      username: 'Coach A',
      email: `coach1@test.local`,
      roleType: 'TRAINER',
      roleSpecifics: 'Strength',
    });
    expect(first.status).toBe(201);

    const second = await authPost(token, `/api/staff/gym/${gym.id}`, {
      username: 'Coach B',
      email: `coach2@test.local`,
      roleType: 'TRAINER',
      roleSpecifics: 'Conditioning',
    });
    expect(second.status).toBe(402);
    expect(second.body.error).toMatch(/trainer/i);
  });

  it('counts trainers and staff independently', async () => {
    const { user: admin, gym } = await seedAdmin();
    await seedSubscription(gym.id, 100, 1, 1);
    const token = await login(admin.email).then((r) => r.body.token as string);

    // Trainer cap reached, but staff should still be allowed.
    await authPost(token, `/api/staff/gym/${gym.id}`, { username: 'Coach', email: `c@test.local`, roleType: 'TRAINER', roleSpecifics: 'S' });
    const staff = await authPost(token, `/api/staff/gym/${gym.id}`, { username: 'Reception', email: `r@test.local`, roleType: 'STAFF', roleSpecifics: 'Receptionist' });
    expect(staff.status).toBe(201);

    const secondStaff = await authPost(token, `/api/staff/gym/${gym.id}`, { username: 'Reception2', email: `r2@test.local`, roleType: 'STAFF', roleSpecifics: 'Receptionist' });
    expect(secondStaff.status).toBe(402);
  });

  it('counts existing members toward the cap (not just created ones)', async () => {
    const { user: admin, gym } = await seedAdmin();
    await seedMember(gym.id); // pre-existing member counts
    await seedSubscription(gym.id, 1, 5, 5);
    const token = await login(admin.email).then((r) => r.body.token as string);

    const res = await authPost(token, `/api/members/gym/${gym.id}`, { username: 'Member Cap', email: `m@test.local`, status: 'ACTIVE' });
    expect(res.status).toBe(402);
  });
});
