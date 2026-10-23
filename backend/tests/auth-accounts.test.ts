import { describe, it, expect } from 'vitest';
import { prisma } from '../src/utils/prisma';
import { registerVendor, seedAdmin, seedMember, seedSuperAdmin, authToken, authGet, authPut } from './helpers';

const seedTrialPlan = () =>
  prisma.saaSPlan.create({
    data: { name: 'Professional', code: 'PROFESSIONAL', monthlyPrice: 2999, maxMembers: 500, maxTrainers: 20, maxStaff: 20 },
  });

describe('Profile', () => {
  it('returns the profile with the gym for a gym admin and a member', async () => {
    const { user: owner, gym } = await seedAdmin();
    const { user: member } = await seedMember(gym.id);

    const ownerRes = await authGet(await authToken(owner), '/api/auth/profile');
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body).toMatchObject({
      id: owner.id,
      email: owner.email,
      role: 'GYM_ADMIN',
      phone: '9999999999',
      gym: { id: gym.id, name: gym.name },
    });
    expect(ownerRes.body.createdAt).toBeTruthy();
    expect(ownerRes.body.password).toBeUndefined();
    expect(ownerRes.body.tokenVersion).toBeUndefined();

    const memberRes = await authGet(await authToken(member), '/api/auth/profile');
    expect(memberRes.body.gym).toEqual({ id: gym.id, name: gym.name });
    expect(memberRes.body.trainerStatus).toBeUndefined();

    const superRes = await authGet(await authToken(await seedSuperAdmin()), '/api/auth/profile');
    expect(superRes.body.gym).toBeNull();
  });

  it('updates name and phone, and can clear the phone', async () => {
    const { user } = await seedAdmin();
    const token = await authToken(user);

    const res = await authPut(token, '/api/auth/profile', { username: 'Ravi Kumar', phone: '+91 98123 45670' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: 'Ravi Kumar', phone: '9812345670' });

    const cleared = await authPut(token, '/api/auth/profile', { phone: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body.phone).toBeNull();
    expect(cleared.body.username).toBe('Ravi Kumar');
  });

  it('rejects bad values and any field outside name and phone', async () => {
    const { user } = await seedMember((await seedAdmin()).gym.id);
    const token = await authToken(user);

    expect((await authPut(token, '/api/auth/profile', { phone: '12345' })).status).toBe(400);
    expect((await authPut(token, '/api/auth/profile', { username: '<b>' })).status).toBe(400);
    expect((await authPut(token, '/api/auth/profile', {})).status).toBe(400);

    for (const extra of [{ role: 'SUPER_ADMIN' }, { email: 'new@test.local' }, { isActive: false }, { tokenVersion: 9 }]) {
      const res = await authPut(token, '/api/auth/profile', { username: 'Sneaky', ...extra });
      expect(res.status).toBe(400);
    }

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after).toMatchObject({ role: 'MEMBER', email: user.email, isActive: true, username: user.username });
  });

  it('requires a token', async () => {
    const res = await authGet('', '/api/auth/profile');
    expect(res.status).toBe(401);
  });
});

describe('Vendor signup trial', () => {
  it('starts exactly one trial for the new gym', async () => {
    await seedTrialPlan();
    const res = await registerVendor();
    expect(res.status).toBe(201);

    const gym = await prisma.gym.findFirstOrThrow({ where: { ownerId: res.body.user.id } });
    const subs = await prisma.gymSubscription.findMany({ where: { gymId: gym.id } });
    expect(subs).toHaveLength(1);
    expect(subs[0]!.status).toBe('TRIAL');
    expect(gym.isApproved).toBe(false);
  });

  it('still registers the vendor when no trial plan exists', async () => {
    const res = await registerVendor();
    expect(res.status).toBe(201);
    const gym = await prisma.gym.findFirstOrThrow({ where: { ownerId: res.body.user.id } });
    expect(await prisma.gymSubscription.count({ where: { gymId: gym.id } })).toBe(0);
  });
});
