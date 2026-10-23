import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { uniq, PASSWORD, seedAdmin, seedTrainer, authToken, authGet, authPut } from './helpers';

const agent = request(app);

const applyAsTrainer = (gymId: string, overrides: Record<string, unknown> = {}) =>
  agent.post('/api/auth/register/trainer').send({
    username: 'Asha Rao',
    email: uniq('trainer'),
    password: PASSWORD,
    phone: '9876501234',
    gymId,
    specialization: 'Mobility',
    experienceYears: 4,
    city: 'Pune',
    bio: 'Former sprinter, now coaching strength and mobility.',
    ...overrides,
  });

const ownerToken = (user: { id: string; role: string }) => authToken(user);

describe('Trainer signup', () => {
  it('creates a pending trainer, issues tokens and notifies the gym owner', async () => {
    const { user: owner, gym } = await seedAdmin();
    const res = await applyAsTrainer(gym.id);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('TRAINER');
    expect(res.body.trainerStatus).toBe('PENDING');
    expect(res.body.refreshToken).toBeUndefined();
    expect((res.headers['set-cookie'] as unknown as string[]).some((c) => c.startsWith('refreshToken='))).toBe(true);

    const details = await prisma.trainerDetails.findUnique({ where: { userId: res.body.user.id } });
    expect(details).toMatchObject({ gymId: gym.id, status: 'PENDING', experienceYears: 4, city: 'Pune', specialization: 'Mobility' });

    const note = await prisma.notification.findFirst({ where: { userId: owner.id, title: 'New trainer application' } });
    expect(note).not.toBeNull();
  });

  it('validates the payload and the gym', async () => {
    const { gym } = await seedAdmin();
    const { gym: closedGym } = await seedAdmin({ approved: false });

    expect((await applyAsTrainer(gym.id, { phone: undefined })).status).toBe(400);
    expect((await applyAsTrainer(gym.id, { experienceYears: 61 })).status).toBe(400);
    expect((await applyAsTrainer(gym.id, { bio: 'x'.repeat(601) })).status).toBe(400);
    expect((await applyAsTrainer('not-a-uuid')).status).toBe(400);
    expect((await applyAsTrainer('8d3c3f7e-2b7a-4f7e-9a51-6f1f5c1d2e3a')).status).toBe(404);
    expect((await applyAsTrainer(closedGym.id)).status).toBe(403);

    const email = uniq('trainer');
    expect((await applyAsTrainer(gym.id, { email })).status).toBe(201);
    expect((await applyAsTrainer(gym.id, { email })).status).toBe(409);
  });

  it('keeps a pending trainer out of gym data but lets them manage their account', async () => {
    const { gym } = await seedAdmin();
    const res = await applyAsTrainer(gym.id);
    const token = res.body.token as string;

    const blocked = await authGet(token, '/api/notices/my');
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('TRAINER_PENDING');

    const me = await authGet(token, '/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.trainerStatus).toBe('PENDING');

    expect((await authGet(token, '/api/auth/profile')).status).toBe(200);
    expect((await authPut(token, '/api/auth/profile', { username: 'Asha R' })).status).toBe(200);
  });

  it('lets the gym admin approve an application', async () => {
    const { user: owner, gym } = await seedAdmin();
    const res = await applyAsTrainer(gym.id);
    const trainerToken = res.body.token as string;
    const adminToken = await ownerToken(owner);

    const list = await authGet(adminToken, `/api/staff/gym/${gym.id}/trainer-applications`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ status: 'PENDING', experienceYears: 4, user: { username: 'Asha Rao' } });

    // Not in the regular staff list until approved.
    const staffBefore = await authGet(adminToken, `/api/staff/gym/${gym.id}`);
    expect(staffBefore.body.trainers).toHaveLength(0);

    const approved = await authPut(adminToken, `/api/staff/trainer-applications/${list.body[0].id}/approve`, {});
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('ACTIVE');

    const again = await authPut(adminToken, `/api/staff/trainer-applications/${list.body[0].id}/approve`, {});
    expect(again.status).toBe(400);

    expect((await authGet(trainerToken, '/api/notices/my')).status).toBe(200);
    expect((await authGet(trainerToken, '/api/auth/me')).body.trainerStatus).toBe('ACTIVE');

    const audit = await prisma.auditLog.findFirst({ where: { action: 'TRAINER_APPROVED', entityId: list.body[0].id } });
    expect(audit?.userId).toBe(owner.id);
    const note = await prisma.notification.findFirst({ where: { userId: res.body.user.id, title: 'Application approved' } });
    expect(note).not.toBeNull();
  });

  it('rejects an application without deleting the account', async () => {
    const { user: owner, gym } = await seedAdmin();
    const res = await applyAsTrainer(gym.id);
    const adminToken = await ownerToken(owner);
    const details = await prisma.trainerDetails.findUniqueOrThrow({ where: { userId: res.body.user.id } });

    const rejected = await agent
      .put(`/api/staff/trainer-applications/${details.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe('REJECTED');

    expect(await prisma.user.findUnique({ where: { id: res.body.user.id } })).not.toBeNull();

    const blocked = await authGet(res.body.token, '/api/notices/my');
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('TRAINER_REJECTED');
    expect((await authGet(res.body.token, '/api/auth/me')).body.trainerStatus).toBe('REJECTED');

    const rejectedList = await authGet(adminToken, `/api/staff/gym/${gym.id}/trainer-applications?status=REJECTED`);
    expect(rejectedList.body).toHaveLength(1);
    expect(await prisma.auditLog.count({ where: { action: 'TRAINER_REJECTED', entityId: details.id } })).toBe(1);
  });

  it('does not let another gym admin see or review the application', async () => {
    const { gym } = await seedAdmin();
    const { user: otherOwner, gym: otherGym } = await seedAdmin();
    const res = await applyAsTrainer(gym.id);
    const details = await prisma.trainerDetails.findUniqueOrThrow({ where: { userId: res.body.user.id } });
    const otherToken = await ownerToken(otherOwner);

    expect((await authGet(otherToken, `/api/staff/gym/${gym.id}/trainer-applications`)).status).toBe(403);
    expect((await authPut(otherToken, `/api/staff/trainer-applications/${details.id}/approve`, {})).status).toBe(404);
    expect((await authPut(otherToken, `/api/staff/trainer-applications/${details.id}/reject`, {})).status).toBe(404);

    const ownList = await authGet(otherToken, `/api/staff/gym/${otherGym.id}/trainer-applications`);
    expect(ownList.body).toHaveLength(0);

    const after = await prisma.trainerDetails.findUniqueOrThrow({ where: { id: details.id } });
    expect(after.status).toBe('PENDING');
  });

  it('keeps trainers added by a gym admin working as before', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedTrainer(gym.id);
    const token = await authToken(user);

    expect((await authGet(token, '/api/notices/my')).status).toBe(200);
    expect((await authGet(token, '/api/auth/me')).body.trainerStatus).toBe('ACTIVE');
  });
});
