import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { hashToken } from '../src/utils/tokens';
import { uniq, PASSWORD, seedAdmin, authToken, authGet, authPost, authDelete } from './helpers';

const agent = request(app);

// The raw token only goes out by email, so tests swap in a known hash.
const knownToken = (inviteId: string, raw: string) =>
  prisma.trainerInvite.update({ where: { id: inviteId }, data: { tokenHash: hashToken(raw) } });

const accept = (token: string) =>
  agent.post('/api/auth/accept-invite').send({ token, name: 'Ravi Kumar', password: PASSWORD });

describe('Trainer invites', () => {
  it('owner invites, trainer accepts and is ACTIVE at the gym', async () => {
    const { user, gym } = await seedAdmin();
    const token = await authToken(user);

    const created = await authPost(token, '/api/trainers/invites', { email: uniq('invitee'), name: 'Ravi Kumar' });
    expect(created.status).toBe(201);
    expect(JSON.stringify(created.body)).not.toContain('tokenHash');
    expect((await authGet(token, '/api/trainers/invites')).body).toHaveLength(1);

    await knownToken(created.body.id, 'a'.repeat(64));
    const res = await accept('a'.repeat(64));
    expect(res.status).toBe(201);
    expect(res.body.trainerStatus).toBe('ACTIVE');

    const details = await prisma.trainerDetails.findUnique({ where: { userId: res.body.user.id } });
    expect(details).toMatchObject({ gymId: gym.id, status: 'ACTIVE' });
    expect((await authGet(token, '/api/trainers/invites')).body).toHaveLength(0);
    expect((await accept('a'.repeat(64))).status).toBe(400);
  });

  it('a revoked invite cannot be accepted', async () => {
    const { user } = await seedAdmin();
    const token = await authToken(user);
    const created = await authPost(token, '/api/trainers/invites', { email: uniq('invitee') });
    expect((await authDelete(token, `/api/trainers/invites/${created.body.id}`)).status).toBe(204);

    await knownToken(created.body.id, 'b'.repeat(64));
    expect((await accept('b'.repeat(64))).status).toBe(400);
  });
});
