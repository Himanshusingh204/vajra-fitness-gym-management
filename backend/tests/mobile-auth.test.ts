import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { uniq, PASSWORD, seedAdmin, login } from './helpers';

const agent = request(app);

const hasRefreshCookie = (res: request.Response) =>
  ((res.headers['set-cookie'] as unknown as string[] | undefined) ?? []).some((c) => c.startsWith('refreshToken='));

const mobileLogin = (email: string) =>
  agent.post('/api/auth/login').set('X-Client', 'mobile').send({ email, password: PASSWORD });

const mobileRefresh = (refreshToken: string) =>
  agent.post('/api/auth/refresh').set('X-Client', 'mobile').send({ refreshToken });

describe('Mobile token flow', () => {
  it('returns the refresh token in the body and sets no cookie', async () => {
    const { user } = await seedAdmin();
    const res = await mobileLogin(user.email);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).toMatch(/^[a-f0-9]{96}$/);
    expect(hasRefreshCookie(res)).toBe(false);
  });

  it('leaves the web flow unchanged', async () => {
    const { user } = await seedAdmin();
    const res = await login(user.email);
    expect(res.body.refreshToken).toBeUndefined();
    expect(hasRefreshCookie(res)).toBe(true);
    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('refreshToken='))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it('does the same for member, trainer and vendor signup', async () => {
    const { gym } = await seedAdmin();
    const signups = [
      agent.post('/api/auth/register/member').set('X-Client', 'mobile').send({
        username: 'Mobile Member', email: uniq('member'), password: PASSWORD, gymId: gym.id,
      }),
      agent.post('/api/auth/register/trainer').set('X-Client', 'mobile').send({
        username: 'Mobile Coach', email: uniq('trainer'), password: PASSWORD, phone: '9876512345', gymId: gym.id,
      }),
      agent.post('/api/auth/register/vendor').set('X-Client', 'mobile').send({
        username: 'Mobile Owner', email: uniq('vendor'), password: PASSWORD, gymName: 'Pocket Gym', address: '3 Lane', city: 'Pune', state: 'MH',
      }),
    ];
    for (const pending of signups) {
      const res = await pending;
      expect(res.status).toBe(201);
      expect(res.body.refreshToken).toBeTruthy();
      expect(hasRefreshCookie(res)).toBe(false);
    }
  });

  it('rotates the token sent in the body', async () => {
    const { user } = await seedAdmin();
    const first = (await mobileLogin(user.email)).body.refreshToken as string;

    const res = await mobileRefresh(first);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.refreshToken).not.toBe(first);
    expect(hasRefreshCookie(res)).toBe(false);

    const next = await mobileRefresh(res.body.refreshToken);
    expect(next.status).toBe(200);
  });

  it('revokes the whole family when an old token is replayed', async () => {
    const { user } = await seedAdmin();
    const first = (await mobileLogin(user.email)).body.refreshToken as string;
    const second = (await mobileRefresh(first)).body.refreshToken as string;

    const replay = await mobileRefresh(first);
    expect(replay.status).toBe(401);
    expect(replay.body.error).toMatch(/reuse/i);

    expect((await mobileRefresh(second)).status).toBe(401);
  });

  it('ignores a cookie in mobile mode and a body token in web mode', async () => {
    const { user } = await seedAdmin();
    const web = await login(user.email);
    const cookie = (web.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('refreshToken='))!.split(';')[0]!;
    const mobile = (await mobileLogin(user.email)).body.refreshToken as string;

    const mobileWithCookie = await agent.post('/api/auth/refresh').set('X-Client', 'mobile').set('Cookie', cookie).send({});
    expect(mobileWithCookie.status).toBe(401);

    const webWithBody = await agent.post('/api/auth/refresh').send({ refreshToken: mobile });
    expect(webWithBody.status).toBe(401);
  });

  it('rejects a missing or malformed body token', async () => {
    expect((await agent.post('/api/auth/refresh').set('X-Client', 'mobile').send({})).status).toBe(401);
    expect((await agent.post('/api/auth/refresh').set('X-Client', 'mobile').send({ refreshToken: 42 })).status).toBe(401);
  });

  it('revokes the body token on logout', async () => {
    const { user } = await seedAdmin();
    const refreshToken = (await mobileLogin(user.email)).body.refreshToken as string;

    const out = await agent.post('/api/auth/logout').set('X-Client', 'mobile').send({ refreshToken });
    expect(out.status).toBe(200);

    const revoked = await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: { not: null } } });
    expect(revoked).toBe(1);
    expect((await mobileRefresh(refreshToken)).status).toBe(401);
  });
});
