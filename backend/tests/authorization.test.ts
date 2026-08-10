import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import {
  login,
  seedAdmin,
  seedMember,
  seedTrainer,
  seedSuperAdmin,
  seedPlan,
  registerVendor,
  authGet,
  authPost,
  PASSWORD,
} from './helpers';

const agent = request(app);

describe('Authorization & gym isolation', () => {
  it('lets a member access only their own profile, not other gyms', async () => {
    const { gym: gymA } = await seedAdmin();
    const { gym: gymB } = await seedAdmin();
    const { user: memberA, details: memberAInfo } = await seedMember(gymA.id);
    await seedMember(gymB.id);

    const token = await login(memberA.email).then((r) => r.body.token as string);

    // Own gym members list is forbidden for a MEMBER.
    const list = await authGet(token, `/api/members/gym/${gymA.id}`);
    expect(list.status).toBe(403);

    // Cannot read another gym's member list.
    const other = await authGet(token, `/api/members/gym/${gymB.id}`);
    expect(other.status).toBe(403);

    // Admin-scoped member record endpoint is forbidden for a MEMBER.
    const direct = await authGet(token, `/api/members/${memberAInfo.id}`);
    expect(direct.status).toBe(403);

    // Self-service profile endpoint works.
    const self = await authGet(token, '/api/members/my-profile');
    expect(self.status).toBe(200);
    expect(self.body.id).toBe(memberAInfo.id);
  });

  it('prevents a gym admin from viewing or mutating another gym', async () => {
    const { user: adminA, gym: gymA } = await seedAdmin();
    const { gym: gymB } = await seedAdmin();
    const token = await login(adminA.email).then((r) => r.body.token as string);

    const listB = await authGet(token, `/api/members/gym/${gymB.id}`);
    expect(listB.status).toBe(403);

    const addB = await authPost(token, `/api/members/gym/${gymB.id}`, { username: 'Cross Gym Member', email: uniqEmail() });
    expect(addB.status).toBe(403);

    const staffB = await authGet(token, `/api/staff/gym/${gymB.id}`);
    expect(staffB.status).toBe(403);

    // Own gym works.
    const listA = await authGet(token, `/api/members/gym/${gymA.id}`);
    expect(listA.status).toBe(200);
  });

  it('lets a trainer at a gym list members but not manage them', async () => {
    const { gym } = await seedAdmin();
    const { user: trainer } = await seedTrainer(gym.id);
    const { details: memberInfo } = await seedMember(gym.id);

    const token = await login(trainer.email).then((r) => r.body.token as string);

    const list = await authGet(token, `/api/members/gym/${gym.id}`);
    expect(list.status).toBe(200);
    expect(list.body.some((m: any) => m.id === memberInfo.id)).toBe(true);

    const add = await authPost(token, `/api/members/gym/${gym.id}`, { username: 'X', email: uniqEmail() });
    expect(add.status).toBe(403);
  });

  it('rejects unauthenticated and token-less requests', async () => {
    const noAuth = await agent.get('/api/members/gym/anything');
    expect(noAuth.status).toBe(401);

    const garbage = await agent.get('/api/auth/me').set('Authorization', 'Bearer not-a-token');
    expect(garbage.status).toBe(401);
  });

  it('rejects non-owner admins from a different gym accessing a member record (IDOR)', async () => {
    const { gym: gymA } = await seedAdmin();
    const { gym: gymB } = await seedAdmin();
    const { details: memberAInfo } = await seedMember(gymA.id);
    const { user: adminB } = await seedAdmin();

    const tokenB = await login(adminB.email).then((r) => r.body.token as string);
    const res = await authGet(tokenB, `/api/members/${memberAInfo.id}`);
    expect(res.status).toBe(403);

    // Same gym admin can read it.
    const gymARow = await prisma.gym.findUniqueOrThrow({ where: { id: gymA.id } });
    const adminA = await prisma.user.findUniqueOrThrow({ where: { id: gymARow.ownerId } });
    const tokenA = await login(adminA.email).then((r) => r.body.token as string);
    const ok = await authGet(tokenA, `/api/members/${memberAInfo.id}`);
    expect(ok.status).toBe(200);
  });

  it('lets a SUPER_ADMIN cross into any gym', async () => {
    const { gym } = await seedAdmin();
    const admin = await seedSuperAdmin();
    const token = await login(admin.email).then((r) => r.body.token as string);

    const list = await authGet(token, `/api/members/gym/${gym.id}`);
    expect(list.status).toBe(200);
  });

  it('enforces role-based guards on staff routes (GYM_ADMIN only)', async () => {
    const { gym } = await seedAdmin();
    const { user: member } = await seedMember(gym.id);
    const token = await login(member.email).then((r) => r.body.token as string);

    const res = await authGet(token, `/api/staff/gym/${gym.id}`);
    expect(res.status).toBe(403);
  });

  it('lets a vendor register and then access their own gym stats', async () => {
    const reg = await registerVendor();
    const token = reg.body.token as string;
    const gym = await prisma.gym.findFirstOrThrow({ where: { ownerId: reg.body.user.id } });

    const stats = await authGet(token, `/api/gym/${gym.id}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body.totalMembers).toBe(0);
  });

  it('blocks creating a membership with a plan from another gym', async () => {
    const { gym: gymA } = await seedAdmin();
    const { gym: gymB, user: adminB } = await seedAdmin();
    const { details: memberA } = await seedMember(gymA.id);
    const foreignPlan = await seedPlan(gymB.id);

    const token = await login(adminB.email).then((r) => r.body.token as string);
    const res = await authPost(token, `/api/memberships/gym/${gymB.id}`, {
      memberId: memberA.id,
      planId: foreignPlan.id,
    });
    // Member doesn't belong to gymB → 500 path via PLAN/MEMBER errors, but must NOT succeed.
    expect([400, 404, 500]).toContain(res.status);
  });

  it('enforces member-only access on self-service endpoints', async () => {
    const { gym } = await seedAdmin();
    const { user: admin } = await seedAdmin();
    const { user: member } = await seedMember(gym.id);

    const memberToken = await login(member.email).then((r) => r.body.token as string);
    const my = await authGet(memberToken, '/api/memberships/my');
    expect(my.status).toBe(200);

    const adminToken = await login(admin.email).then((r) => r.body.token as string);
    const forbidden = await authGet(adminToken, '/api/memberships/my');
    expect(forbidden.status).toBe(403);
  });
});

const uniqEmail = () => `iso${Date.now()}${Math.floor(Math.random() * 1e6)}@test.local`;
