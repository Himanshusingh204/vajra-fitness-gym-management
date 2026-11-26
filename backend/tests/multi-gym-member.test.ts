import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedMember, seedTrainer, login, authGet, authPost, authDelete } from './helpers';

const agent = request(app);
const DAY = 24 * 60 * 60 * 1000;
const tokenFor = async (email: string) => (await login(email)).body.token as string;

const activeMembership = (memberId: string, gymId: string, startedDaysAgo: number) =>
  prisma.membership.create({
    data: {
      memberId, gymId, status: 'ACTIVE',
      startDate: new Date(Date.now() - startedDaysAgo * DAY), endDate: new Date(Date.now() + 30 * DAY),
      originalAmount: 1000, finalAmount: 1000,
    },
  });

// One user who is a member at gym A (older) and gym B (newer).
const seedTwoGymMember = async () => {
  const a = await seedAdmin();
  const b = await seedAdmin();
  await prisma.gym.update({ where: { id: b.gym.id }, data: { name: 'Second Gym' } });
  const { user, details: atA } = await seedMember(a.gym.id);
  const atB = await prisma.memberDetails.create({ data: { userId: user.id, gymId: b.gym.id, status: 'ACTIVE' } });
  const membershipA = await activeMembership(atA.id, a.gym.id, 20);
  const membershipB = await activeMembership(atB.id, b.gym.id, 2);
  return { a, b, user, atA, atB, membershipA, membershipB };
};

describe('Member at many gyms', () => {
  it('lists every gym the user belongs to', async () => {
    const { a, b, user } = await seedTwoGymMember();
    const res = await authGet(await tokenFor(user.email), '/api/members/my-gyms');
    expect(res.status).toBe(200);
    expect(res.body.map((m: any) => m.gym.id).sort()).toEqual([a.gym.id, b.gym.id].sort());
    expect(res.body[0]).toMatchObject({ gym: { id: b.gym.id, name: 'Second Gym' }, status: 'ACTIVE' });
    expect(res.body[0].activeMembership.status).toBe('ACTIVE');
  });

  it('scopes member endpoints to the chosen gym and defaults to the latest active membership', async () => {
    const { a, b, user, membershipA, membershipB } = await seedTwoGymMember();
    const token = await tokenFor(user.email);

    const scopedA = await authGet(token, `/api/memberships/my?gymId=${a.gym.id}`);
    expect(scopedA.body.map((m: any) => m.id)).toEqual([membershipA.id]);

    const byHeader = await authGet(token, '/api/memberships/my').set('X-Gym-Id', a.gym.id);
    expect(byHeader.body.map((m: any) => m.id)).toEqual([membershipA.id]);

    const byDefault = await authGet(token, '/api/memberships/my');
    expect(byDefault.body.map((m: any) => m.id)).toEqual([membershipB.id]);

    const profileA = await authGet(token, `/api/members/my-profile?gymId=${a.gym.id}`);
    expect(profileA.body.gymId).toBe(a.gym.id);
    expect((await authGet(token, '/api/members/my-profile')).body.gymId).toBe(b.gym.id);

    const me = await authGet(token, '/api/auth/me');
    expect(me.body.memberDetails.gym.id).toBe(b.gym.id);
    expect((await authGet(token, '/api/auth/profile')).body.gym.id).toBe(b.gym.id);
  });

  it('refuses a gym the user is not a member of', async () => {
    const { user } = await seedTwoGymMember();
    const { gym: other } = await seedAdmin();
    const res = await authGet(await tokenFor(user.email), `/api/memberships/my?gymId=${other.id}`);
    expect(res.status).toBe(404);
  });

  it('checks in and reads attendance at the chosen gym only', async () => {
    const { a, b, user, atA } = await seedTwoGymMember();
    const token = await tokenFor(user.email);

    const checkIn = await authPost(token, `/api/attendance/my/check-in?gymId=${a.gym.id}`, {});
    expect(checkIn.status).toBe(201);
    expect(checkIn.body.gymId).toBe(a.gym.id);
    expect(checkIn.body.memberId).toBe(atA.id);

    expect((await authGet(token, `/api/attendance/my?gymId=${a.gym.id}`)).body.total).toBe(1);
    expect((await authGet(token, `/api/attendance/my?gymId=${b.gym.id}`)).body.total).toBe(0);
  });

  it('books a trainer with the profile at that trainer’s gym', async () => {
    const { b, user } = await seedTwoGymMember();
    const { user: trainer } = await seedTrainer(b.gym.id);
    const token = await tokenFor(user.email);
    const date = new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10);

    const res = await authPost(token, '/api/bookings', { trainerId: trainer.id, date, time: '10:00' });
    expect(res.status).toBe(201);
    expect(res.body.gymId).toBe(b.gym.id);
  });

  it('enrolling at another gym adds a membership instead of moving the old one', async () => {
    const { a, b, user, atA, atB } = await seedTwoGymMember();
    const { gym: third } = await seedAdmin();
    const res = await authPost(await tokenFor(user.email), '/api/members/enroll', { gymId: third.id });
    expect(res.status).toBe(201);

    const rows = await prisma.memberDetails.findMany({ where: { userId: user.id } });
    expect(rows.map((r) => r.gymId).sort()).toEqual([a.gym.id, b.gym.id, third.id].sort());
    expect(rows.find((r) => r.id === atA.id)?.gymId).toBe(a.gym.id);
    expect(rows.find((r) => r.id === atB.id)?.gymId).toBe(b.gym.id);
  });

  it('re-enrolling at a gym where already active returns 409 and keeps the status', async () => {
    const { a, user, atA } = await seedTwoGymMember();
    const res = await authPost(await tokenFor(user.email), '/api/members/enroll', { gymId: a.gym.id });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_MEMBER');
    expect((await prisma.memberDetails.findUnique({ where: { id: atA.id } }))?.status).toBe('ACTIVE');
  });

  it('re-enrolling while frozen returns 409, while expired it asks again', async () => {
    const { a, b, user, atA, atB } = await seedTwoGymMember();
    await prisma.memberDetails.update({ where: { id: atA.id }, data: { status: 'FROZEN' } });
    await prisma.membership.updateMany({ where: { memberId: atB.id }, data: { status: 'EXPIRED' } });
    await prisma.memberDetails.update({ where: { id: atB.id }, data: { status: 'EXPIRED' } });
    const token = await tokenFor(user.email);

    expect((await authPost(token, '/api/members/enroll', { gymId: a.gym.id })).status).toBe(409);
    expect((await prisma.memberDetails.findUnique({ where: { id: atA.id } }))?.status).toBe('FROZEN');
    expect((await authPost(token, '/api/members/enroll', { gymId: b.gym.id })).status).toBe(200);
    expect((await prisma.memberDetails.findUnique({ where: { id: atB.id } }))?.status).toBe('PENDING');
  });

  it('an owner can add a member of another gym without a new account', async () => {
    const { a, user, atA } = await seedTwoGymMember();
    const { user: owner, gym } = await seedAdmin();
    const token = await tokenFor(owner.email);

    const res = await authPost(token, `/api/members/gym/${gym.id}`, { username: 'Someone Else', email: user.email });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(user.id);
    expect(res.body.activationLink).toBeNull();
    expect(res.body.memberDetails.gymId).toBe(gym.id);
    expect(JSON.stringify(res.body)).not.toContain(a.gym.id);
    // Their other gyms and password are untouched.
    expect((await prisma.memberDetails.findUnique({ where: { id: atA.id } }))?.status).toBe('ACTIVE');
    expect((await login(user.email)).status).toBe(200);

    const again = await authPost(token, `/api/members/gym/${gym.id}`, { username: 'Someone Else', email: user.email });
    expect(again.status).toBe(409);
    expect((await authPost(token, `/api/members/gym/${gym.id}`, { username: 'Owner', email: a.user.email })).status).toBe(400);
  });

  it('CSV import links members of other gyms and skips staff accounts', async () => {
    const { a, user } = await seedTwoGymMember();
    const { user: owner, gym } = await seedAdmin();
    const csv = `username,email
Linked,${user.email}
Owner,${a.user.email}
Fresh,fresh${Date.now()}@test.local`;

    const res = await authPost(await tokenFor(owner.email), `/api/members/gym/${gym.id}/import`, { csv });
    expect(res.status).toBe(201);
    expect(res.body.imported).toBe(2);
    expect(res.body.errors).toEqual([{ row: 3, email: a.user.email, error: 'Email already registered' }]);
    expect(await prisma.memberDetails.count({ where: { userId: user.id, gymId: gym.id, status: 'PENDING' } })).toBe(1);
    expect((await login(user.email)).status).toBe(200);
  });

  it('adding the same user to the same gym twice gives 409, and CSV import skips them', async () => {
    const { user: owner, gym } = await seedAdmin();
    const { user } = await seedMember((await seedAdmin()).gym.id);
    const token = await tokenFor(owner.email);
    const body = { username: 'Repeat Member', email: user.email };

    expect((await authPost(token, `/api/members/gym/${gym.id}`, body)).status).toBe(201);
    const again = await authPost(token, `/api/members/gym/${gym.id}`, body);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ALREADY_MEMBER');

    const res = await authPost(token, `/api/members/gym/${gym.id}/import`, { csv: `username,email
Repeat Member,${user.email}` });
    expect(res.status).toBe(201);
    expect(res.body.imported).toBe(0);
    expect(res.body.skipped).toBe(1);
    expect(res.body.errors).toEqual([{ row: 2, email: user.email, error: 'Already a member of this gym' }]);
    expect(await prisma.memberDetails.count({ where: { userId: user.id, gymId: gym.id } })).toBe(1);
  });

  it('removing a member with fees keeps the row as INACTIVE', async () => {
    const { user: owner, gym } = await seedAdmin();
    const { user, details } = await seedMember(gym.id);
    await prisma.fee.create({ data: { memberId: details.id, gymId: gym.id, amount: 500, dueDate: new Date() } });

    expect((await authDelete(await tokenFor(owner.email), `/api/members/${details.id}`)).status).toBe(200);
    expect((await prisma.memberDetails.findUnique({ where: { id: details.id } }))?.status).toBe('INACTIVE');
    expect(await prisma.fee.count({ where: { memberId: details.id } })).toBe(1);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });

  it('owner of gym A sees only the gym A side of the user', async () => {
    const { a, b, user, atA, atB, membershipB } = await seedTwoGymMember();
    await prisma.fee.create({ data: { memberId: atB.id, gymId: b.gym.id, amount: 500, dueDate: new Date(Date.now() + DAY) } });
    const token = await tokenFor(a.user.email);

    const members = await authGet(token, `/api/members/gym/${a.gym.id}`);
    expect(members.body.map((m: any) => m.id)).toEqual([atA.id]);

    expect((await authGet(token, `/api/members/${atB.id}`)).status).toBe(403);
    expect((await authGet(token, `/api/memberships/${membershipB.id}`)).status).toBe(403);
    expect((await authGet(token, `/api/fees/member/${atB.id}`)).status).toBe(403);
    expect((await authGet(token, `/api/fees/gym/${a.gym.id}`)).body).toEqual([]);
    expect((await authGet(token, `/api/memberships/gym/${a.gym.id}?memberId=${atB.id}`)).body).toEqual([]);

    // Removing them from gym A keeps their account and their gym B membership.
    expect((await authDelete(token, `/api/members/${atA.id}`)).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
    expect(await prisma.memberDetails.findUnique({ where: { id: atB.id } })).not.toBeNull();
    expect(await prisma.memberDetails.findUnique({ where: { id: atA.id } })).toBeNull();
    expect((await login(user.email)).status).toBe(200);
  });

  it('still deletes the account of a member with only one gym', async () => {
    const { user: owner, gym } = await seedAdmin();
    const { user, details } = await seedMember(gym.id);
    const res = await authDelete(await tokenFor(owner.email), `/api/members/${details.id}`);
    expect(res.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });

  it('allows one membership row per user per gym', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedMember(gym.id);
    await expect(prisma.memberDetails.create({ data: { userId: user.id, gymId: gym.id } })).rejects.toThrow();
  });
});

describe('Single-gym clients keep working', () => {
  it('returns the old shapes without a gymId', async () => {
    const { gym } = await seedAdmin();
    const { user, details } = await seedMember(gym.id);
    const token = await tokenFor(user.email);

    const me = await agent.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.memberDetails.id).toBe(details.id);
    expect((await authGet(token, '/api/members/my-profile')).body.id).toBe(details.id);
  });
});
