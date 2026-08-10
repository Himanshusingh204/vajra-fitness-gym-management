import { describe, it, expect } from 'vitest';
import { seedAdmin, seedMember, seedTrainer, login, authGet, authPost, authPut, authDelete } from './helpers';

describe('Notices (announcements)', () => {
  it('lets a gym admin create, list, update and delete notices', async () => {
    const { user: admin, gym } = await seedAdmin();
    const token = await login(admin.email).then((r) => r.body.token as string);

    const created = await authPost(token, `/api/notices/gym/${gym.id}`, {
      title: 'Holiday closure',
      content: 'Gym closed on Monday for maintenance.',
    });
    expect(created.status).toBe(201);
    expect(created.body.title).toBe('Holiday closure');

    const list = await authGet(token, `/api/notices/gym/${gym.id}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);

    const updated = await authPut(token, `/api/notices/${created.body.id}`, { title: 'Holiday closure (updated)' });
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe('Holiday closure (updated)');

    const deleted = await authDelete(token, `/api/notices/${created.body.id}`);
    expect(deleted.status).toBe(200);

    const after = await authGet(token, `/api/notices/gym/${gym.id}`);
    expect(after.body.length).toBe(0);
  });

  it('scopes notices to their gym (no cross-gym leaks)', async () => {
    const { user: adminA, gym: gymA } = await seedAdmin();
    const { user: adminB, gym: gymB } = await seedAdmin();
    const tokenA = await login(adminA.email).then((r) => r.body.token as string);

    await authPost(tokenA, `/api/notices/gym/${gymA.id}`, { title: 'A only', content: 'secret A' });

    const tokenB = await login(adminB.email).then((r) => r.body.token as string);
    const listB = await authGet(tokenB, `/api/notices/gym/${gymA.id}`);
    expect(listB.status).toBe(403);

    const listOwnB = await authGet(tokenB, `/api/notices/gym/${gymB.id}`);
    expect(listOwnB.status).toBe(200);
    expect(listOwnB.body.length).toBe(0);
  });

  it('validates notice input', async () => {
    const { user: admin, gym } = await seedAdmin();
    const token = await login(admin.email).then((r) => r.body.token as string);

    const res = await authPost(token, `/api/notices/gym/${gym.id}`, { title: 'X', content: '' });
    expect(res.status).toBe(400);
  });

  it('rejects non-owner gym admins and members from managing notices', async () => {
    const { gym: gymA } = await seedAdmin();
    const { user: otherAdmin } = await seedAdmin(); // owns gymB, not gymA
    const { user: member } = await seedMember(gymA.id);

    const adminToken = await login(otherAdmin.email).then((r) => r.body.token as string);
    const forbidden = await authPost(adminToken, `/api/notices/gym/${gymA.id}`, { title: 'No', content: 'No' });
    expect(forbidden.status).toBe(403);

    const memberToken = await login(member.email).then((r) => r.body.token as string);
    const memberCreate = await authPost(memberToken, `/api/notices/gym/${gymA.id}`, { title: 'No', content: 'No' });
    expect(memberCreate.status).toBe(403);
  });

  it('lets members and trainers read their own gym announcements', async () => {
    const { user: admin, gym } = await seedAdmin();
    const { user: member } = await seedMember(gym.id);
    const { user: trainer } = await seedTrainer(gym.id);
    const token = await login(admin.email).then((r) => r.body.token as string);

    await authPost(token, `/api/notices/gym/${gym.id}`, { title: 'Welcome', content: 'Opening hours are 6am-10pm.' });

    const memberToken = await login(member.email).then((r) => r.body.token as string);
    const memberView = await authGet(memberToken, '/api/notices/my');
    expect(memberView.status).toBe(200);
    expect(memberView.body.length).toBe(1);
    expect(memberView.body[0].title).toBe('Welcome');

    const trainerToken = await login(trainer.email).then((r) => r.body.token as string);
    const trainerView = await authGet(trainerToken, '/api/notices/my');
    expect(trainerView.status).toBe(200);
    expect(trainerView.body.length).toBe(1);
  });

  it('returns an empty list for members with no gym', async () => {
    const { user: admin, gym } = await seedAdmin();
    const token = await login(admin.email).then((r) => r.body.token as string);
    await authPost(token, `/api/notices/gym/${gym.id}`, { title: 'T', content: 'C' });
    const view = await authGet(token, '/api/notices/my');
    // The owner has no member/trainer/staff profile → empty list.
    expect(view.status).toBe(200);
    expect(view.body).toEqual([]);
  });
});
