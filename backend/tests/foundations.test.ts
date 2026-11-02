import crypto from 'crypto';
import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { logger } from '../src/utils/logger';
import { enqueueJob, runJobs } from '../src/jobs/queue';
import { seedAdmin, seedMember, PASSWORD } from './helpers';

const agent = request(app);
const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('/api/v1 alias', () => {
  it('serves the same routes as /api', async () => {
    const { user } = await seedAdmin();
    const res = await agent.post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();

    const me = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(user.email);
  });

  it('still 404s unknown v1 routes with the error envelope', async () => {
    const res = await agent.get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });
});

describe('Database unreachable', () => {
  it('answers 503 instead of a generic 500', async () => {
    const down = new Prisma.PrismaClientInitializationError("Can't reach database server", '5.22.0', 'P1001');
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(down);
    vi.spyOn(prisma, '$queryRaw').mockRejectedValue(down);

    const res = await agent.post('/api/auth/login').send({ email: 'someone@test.local', password: PASSWORD });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Database unreachable', code: 'DB_UNREACHABLE' });
  });
});

describe('Hashed one-time tokens', () => {
  it('stores only the sha256 of a reset token', async () => {
    const { user } = await seedMember((await seedAdmin()).gym.id);
    await agent.post('/api/auth/forgot-password').send({ email: user.email });

    const row = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('accepts the plain token from the link and rejects the stored hash', async () => {
    const { user } = await seedMember((await seedAdmin()).gym.id);
    const token = 'r'.repeat(64);
    await prisma.passwordResetToken.create({ data: { tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 60_000) } });

    const byHash = await agent.post('/api/auth/reset-password').send({ token: sha256(token), newPassword: 'NewPassw0rd!1' });
    expect(byHash.status).toBe(400);
    const byToken = await agent.post('/api/auth/reset-password').send({ token, newPassword: 'NewPassw0rd!1' });
    expect(byToken.status).toBe(200);
  });

  it('activates with the plain token while only the hash is stored', async () => {
    const { user } = await seedMember((await seedAdmin()).gym.id);
    const token = 'a'.repeat(64);
    await prisma.activationToken.create({ data: { tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 60_000) } });

    const res = await agent.post('/api/auth/activate').send({ token, password: 'NewPassw0rd!1' });
    expect(res.status).toBe(200);
  });
});

describe('Logger redaction', () => {
  it('hides secrets at any depth', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line: string) => { lines.push(line); });

    logger.info('login attempt', {
      email: 'a@b.c',
      password: 'hunter2',
      headers: { authorization: 'Bearer abc', 'x-razorpay-signature': 'sig' },
      body: { razorpay_signature: 'sig', refreshToken: 'tok', nested: [{ token: 'tok' }] },
    });

    const out = lines.join('\n');
    expect(out).toContain('a@b.c');
    for (const secret of ['hunter2', 'Bearer abc', 'sig', 'tok']) expect(out).not.toContain(`"${secret}"`);
    expect(out).toContain('[REDACTED]');
  });
});

describe('Job queue', () => {
  it('runs a queued email job once', async () => {
    const job = await enqueueJob('EMAIL', { to: 'a@test.local', subject: 'Hi', html: '<p>Hi</p>' });
    await runJobs();
    const done = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(done.status).toBe('DONE');
    expect(done.attempts).toBe(1);

    await runJobs();
    expect((await prisma.job.findUniqueOrThrow({ where: { id: job.id } })).attempts).toBe(1);
  });

  it('retries a failing job later and gives up after the last attempt', async () => {
    const job = await enqueueJob('NO_SUCH_TYPE', {}, { maxAttempts: 2 });

    await runJobs();
    const retry = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(retry.status).toBe('QUEUED');
    expect(retry.attempts).toBe(1);
    expect(retry.lastError).toContain('NO_SUCH_TYPE');
    expect(retry.runAt.getTime()).toBeGreaterThan(Date.now());

    // Not due yet, so a second run leaves it alone.
    await runJobs();
    expect((await prisma.job.findUniqueOrThrow({ where: { id: job.id } })).attempts).toBe(1);

    await prisma.job.update({ where: { id: job.id }, data: { runAt: new Date(Date.now() - 1000) } });
    await runJobs();
    const failed = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(failed.status).toBe('FAILED');
    expect(failed.attempts).toBe(2);
  });

  it('picks a job up once even when two workers run at the same moment', async () => {
    const job = await enqueueJob('EMAIL', { to: 'a@test.local', subject: 'Hi', html: '<p>Hi</p>' });
    await Promise.all([runJobs(), runJobs()]);
    expect((await prisma.job.findUniqueOrThrow({ where: { id: job.id } })).attempts).toBe(1);
  });
});
