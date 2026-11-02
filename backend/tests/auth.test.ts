import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { registerVendor, login, uniq, PASSWORD, seedAdmin, seedSuperAdmin, authPost } from './helpers';

const agent = request(app);

const refreshCookie = (res: request.Response) => {
  const raw = (res.headers['set-cookie'] as string[] | undefined)?.find((c) => c.startsWith('refreshToken='));
  return raw ? raw.split(';')[0] : undefined;
};

describe('Auth', () => {
  beforeEach(async () => {
    // Fresh lockout state per test (in-memory map in auth.controller).
  });

  it('registers a vendor with a refresh cookie and access token', async () => {
    const res = await registerVendor();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('GYM_ADMIN');
    expect(refreshCookie(res)).toMatch(/^refreshToken=/);
  });

  it('rejects a duplicate vendor email', async () => {
    const email = uniq('vendor');
    await registerVendor({ email });
    const res = await registerVendor({ email });
    expect(res.status).toBe(409);
  });

  it('returns field-level validation issues for invalid vendor registration', async () => {
    const res = await agent.post('/api/auth/register/vendor').send({
      username: 'Gym Owner', email: uniq('vendor-validation'), password: PASSWORD,
      phone: '1111111111', gymName: '<b></b>', address: '12 Road', city: 'Pune', state: 'MH',
    });
    expect(res.status).toBe(400);
    expect(res.body.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'phone' }),
      expect.objectContaining({ path: 'gymName' }),
    ]));
  });

  it('logs in with correct credentials and rejects bad ones', async () => {
    const { user } = await seedAdmin();
    const ok = await login(user.email);
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const bad = await login(user.email, 'WrongPass123!');
    expect(bad.status).toBe(400);
  });

  it('locks an account after five failed login attempts', async () => {
    const { user } = await seedAdmin();
    for (let i = 0; i < 5; i += 1) {
      await login(user.email, 'WrongPass123!');
    }
    const res = await login(user.email, PASSWORD);
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/attempts/);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const { user } = await seedAdmin();
    const loginRes = await login(user.email);
    const cookie1 = refreshCookie(loginRes);
    expect(cookie1).toBeDefined();

    const refresh1 = await agent.post('/api/auth/refresh').set('Cookie', cookie1!);
    expect(refresh1.status).toBe(200);
    expect(refresh1.body.token).toBeTruthy();
    const cookie2 = refreshCookie(refresh1);
    expect(cookie2).not.toBe(cookie1);

    // Presenting the already-rotated token is treated as theft.
    const reuse = await agent.post('/api/auth/refresh').set('Cookie', cookie1!);
    expect(reuse.status).toBe(401);

    // The legitimately rotated token in the same family is now revoked too.
    const revoked = await agent.post('/api/auth/refresh').set('Cookie', cookie2!);
    expect(revoked.status).toBe(401);
  });

  it('keeps the refresh cookie session-only when remember me is off', async () => {
    const { user } = await seedAdmin();
    const res = await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD, rememberMe: false });
    expect(res.status).toBe(200);
    const raw = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('refreshToken='))!;
    expect(raw).not.toMatch(/Max-Age|Expires/i);

    const marker = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('sessionOnly='))!.split(';')[0];
    const refreshed = await agent.post('/api/auth/refresh').set('Cookie', [refreshCookie(res)!, marker]);
    expect(refreshed.status).toBe(200);
    const rotated = (refreshed.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('refreshToken='))!;
    expect(rotated).not.toMatch(/Max-Age|Expires/i);

    const remembered = await login(user.email);
    const persistent = (remembered.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('refreshToken='))!;
    expect(persistent).toMatch(/Max-Age/i);
  });

  it('rejects a refresh request from an unconfigured browser origin', async () => {
    const { user } = await seedAdmin();
    const loginRes = await login(user.email);
    const cookie = refreshCookie(loginRes);

    const refresh = await agent
      .post('/api/auth/refresh')
      .set('Cookie', cookie!)
      .set('Origin', 'https://untrusted-preview.vercel.app');

    expect(refresh.status).toBe(403);
  });

  it('activates an admin-created member via one-time link, then logs in', async () => {
    const { user: admin, gym } = await seedAdmin();
    const adminToken = await login(admin.email).then((r) => r.body.token as string);

    const addRes = await authPost(adminToken, `/api/members/gym/${gym.id}`, {
      username: 'New Member',
      email: uniq('activation'),
      phone: '9898989898',
    });
    expect(addRes.status).toBe(201);
    const activationLink = addRes.body.activationLink as string;
    expect(activationLink).toContain('/activate?token=');

    const token = activationLink.split('token=')[1];
    const act = await agent.post('/api/auth/activate').send({ token, password: PASSWORD });
    expect(act.status).toBe(200);
    expect(act.body.token).toBeTruthy();

    const member = await prisma.user.findUniqueOrThrow({ where: { email: addRes.body.email } });
    const again = await login(member.email, PASSWORD);
    expect(again.status).toBe(200);

    // Token is single-use.
    const replay = await agent.post('/api/auth/activate').send({ token, password: PASSWORD });
    expect(replay.status).toBe(400);
  });

  it('logs out and revokes the refresh token', async () => {
    const { user } = await seedAdmin();
    const loginRes = await login(user.email);
    const cookie = refreshCookie(loginRes);

    const out = await agent.post('/api/auth/logout').set('Cookie', cookie!);
    expect(out.status).toBe(200);

    const refresh = await agent.post('/api/auth/refresh').set('Cookie', cookie!);
    expect(refresh.status).toBe(401);
  });

  it('rejects suspended accounts at login', async () => {
    const { user } = await seedAdmin();
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    const res = await login(user.email);
    expect(res.status).toBe(403);
  });

  it('rejects access with a suspended account even with a valid token', async () => {
    const { user } = await seedAdmin();
    const res = await login(user.email);
    const token = res.body.token;
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    const me = await agent.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(403);
  });

  it('serves /auth/me with the authenticated profile', async () => {
    const { user } = await seedAdmin();
    const token = await login(user.email).then((r) => r.body.token as string);
    const me = await agent.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(user.email);
  });

  it('allows a SUPER_ADMIN to log in', async () => {
    const admin = await seedSuperAdmin();
    const res = await login(admin.email);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('SUPER_ADMIN');
  });
});

describe('API origin browser entry points', () => {
  it('redirects the API root to the configured frontend', async () => {
    const res = await agent.get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(process.env.FRONTEND_URL);
  });

  it('redirects the conventional favicon URL to the frontend mark', async () => {
    const res = await agent.get('/favicon.ico');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${process.env.FRONTEND_URL}/favicon.svg`);
  });
});
