import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedMember, seedTrainer, seedSuperAdmin, authToken, authGet, authPost } from './helpers';

const ymd = (daysAhead: number) => new Date(Date.now() + daysAhead * 864e5).toISOString().slice(0, 10);
const patch = (token: string, path: string, body: object) =>
  request(app).patch(path).set('Authorization', `Bearer ${token}`).send(body);

const setup = async () => {
  const { gym } = await seedAdmin();
  const member = await seedMember(gym.id);
  const trainer = await seedTrainer(gym.id);
  const token = await authToken(member.user);
  return { gym, member, trainer, token };
};

describe('PT slots and reschedule', () => {
  it('rejects impossible calendar dates and times outside advertised slots', async () => {
    const { trainer, token } = await setup();
    const base = { trainerId: trainer.user.id, date: ymd(4), time: '10:00' };
    expect((await authPost(token, '/api/bookings', { ...base, date: '2030-02-30' })).status).toBe(400);
    expect((await authPost(token, '/api/bookings', { ...base, time: '10:30' })).status).toBe(400);
    expect((await authPost(token, '/api/bookings', { ...base, time: '21:00' })).status).toBe(400);
  });

  it('keeps internal trainer commission out of the public booking directory', async () => {
    const { gym, trainer } = await setup();
    await prisma.trainerDetails.update({ where: { userId: trainer.user.id }, data: { commissionRate: 25 } });
    const response = await request(app).get(`/api/bookings/trainers?gymId=${gym.id}`);
    expect(response.status).toBe(200);
    const item = response.body.find((t: any) => t.userId === trainer.user.id);
    expect(item).toBeDefined();
    expect(item).not.toHaveProperty('commissionRate');
  });

  it('reserves a trainer slot only once under concurrent requests', async () => {
    const { gym, trainer, token } = await setup();
    const other = await seedMember(gym.id);
    const tokens = [token, await authToken(other.user)];
    const responses = await Promise.all(tokens.map((t) => authPost(t, '/api/bookings', { trainerId: trainer.user.id, date: ymd(4), time: '10:00' })));
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.booking.count({ where: { trainerId: trainer.user.id, date: ymd(4), time: '10:00' } })).toBe(1);
  });

  it('does not reopen a cancelled session after its slot was booked again', async () => {
    const { gym, trainer, member } = await setup();
    const cancelled = await prisma.booking.create({ data: { gymId: gym.id, trainerId: trainer.user.id, userId: member.user.id, date: ymd(4), time: '10:00', status: 'CANCELLED' } });
    const response = await patch(await authToken(trainer.user), `/api/bookings/${cancelled.id}`, { status: 'CONFIRMED' });
    expect(response.status).toBe(409);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: cancelled.id } })).status).toBe('CANCELLED');
  });

  it('hides taken slots and only offers trainers from the member gym', async () => {
    const { gym, member, trainer, token } = await setup();
    const date = ymd(3);
    await prisma.booking.create({ data: { userId: member.user.id, trainerId: trainer.user.id, gymId: gym.id, date, time: '09:00' } });

    const res = await authGet(token, `/api/bookings/slots?trainerId=${trainer.user.id}&date=${date}`);
    expect(res.status).toBe(200);
    expect(res.body.find((s: any) => s.time === '09:00').available).toBe(false);
    expect(res.body.find((s: any) => s.time === '10:00').available).toBe(true);

    const other = await seedAdmin();
    const stranger = await seedTrainer(other.gym.id);
    expect((await authGet(token, `/api/bookings/slots?trainerId=${stranger.user.id}&date=${date}`)).status).toBe(403);
  });

  it('blocks slot lookups for a pending member', async () => {
    const { gym, trainer } = await setup();
    const pending = await seedMember(gym.id, { status: 'PENDING' });
    const token = await authToken(pending.user);
    const res = await authGet(token, `/api/bookings/slots?trainerId=${trainer.user.id}&date=${ymd(3)}`);
    expect(res.status).toBe(403);
  });

  it('lets a member move their own session, back to pending, and blocks clashes and strangers', async () => {
    const { gym, member, trainer, token } = await setup();
    const date = ymd(4);
    const mine = await prisma.booking.create({ data: { userId: member.user.id, trainerId: trainer.user.id, gymId: gym.id, date, time: '09:00', status: 'CONFIRMED' } });
    const otherMember = await seedMember(gym.id);
    await prisma.booking.create({ data: { userId: otherMember.user.id, trainerId: trainer.user.id, gymId: gym.id, date, time: '11:00' } });

    expect((await patch(token, `/api/bookings/${mine.id}/reschedule`, { date, time: '11:00' })).status).toBe(409);

    const ok = await patch(token, `/api/bookings/${mine.id}/reschedule`, { date, time: '12:00' });
    expect(ok.status).toBe(200);
    expect(ok.body.time).toBe('12:00');
    expect(ok.body.status).toBe('PENDING');

    const strangerToken = await authToken(otherMember.user);
    expect((await patch(strangerToken, `/api/bookings/${mine.id}/reschedule`, { date, time: '13:00' })).status).toBe(404);
  });
});

describe('Public classes', () => {
  it('does not expose trainer compensation or allow booking a disabled class', async () => {
    const { gym, trainer, token } = await setup();
    const gymClass = await prisma.gymClass.create({ data: { gymId: gym.id, name: 'Strength', trainerId: trainer.details.id } });
    const response = await request(app).get(`/api/classes/gym/${gym.id}`);
    expect(response.status).toBe(200);
    expect(response.body[0].trainer.user.username).toBe(trainer.user.username);
    expect(response.body[0].trainer).not.toHaveProperty('commissionRate');
    await prisma.gymClass.update({ where: { id: gymClass.id }, data: { isActive: false } });
    expect((await authPost(token, `/api/classes/${gymClass.id}/book`, {})).status).toBe(404);
  });
});

describe('Admin overview', () => {
  it('counts members, trainers, owners and gyms for the super admin only', async () => {
    const { gym, user } = await seedAdmin();
    await seedMember(gym.id);
    await seedTrainer(gym.id);
    const root = await seedSuperAdmin();

    const res = await authGet(await authToken(root), '/api/admin/overview');
    expect(res.status).toBe(200);
    expect(res.body.members.total).toBeGreaterThanOrEqual(1);
    expect(res.body.trainers.last30).toBeGreaterThanOrEqual(1);
    expect(res.body.gyms.total).toBeGreaterThanOrEqual(1);

    expect((await authGet(await authToken(user), '/api/admin/overview')).status).toBe(403);
  });
});
