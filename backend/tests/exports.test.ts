import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedMember, seedSuperAdmin, authToken } from './helpers';

const agent = request(app);
const get = (token: string, path: string) => agent.get(`/api/exports${path}`).set('Authorization', `Bearer ${token}`);

describe('CSV exports', () => {
  it('exports the owner\'s members as escaped CSV and logs it', async () => {
    const { user, gym } = await seedAdmin();
    const { user: member } = await seedMember(gym.id);
    await prisma.user.update({ where: { id: member.id }, data: { username: '=HYPERLINK("x"),Raj\nSingh' } });

    const res = await get(await authToken(user), `/gym/${gym.id}/members.csv`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="members-/);
    expect(res.text).toContain(`"'=HYPERLINK(""x""),Raj\nSingh",${member.email}`);

    const log = await prisma.auditLog.findFirst({ where: { action: 'EXPORT_CSV', userId: user.id } });
    expect(log?.entity).toBe('Member');
  });

  it('exports payments, attendance, expenses and bookings for the gym only', async () => {
    const { user, gym } = await seedAdmin();
    const { gym: other } = await seedAdmin();
    await prisma.expense.create({ data: { gymId: gym.id, category: 'RENT', description: 'March rent', amount: 5000 } });
    await prisma.expense.create({ data: { gymId: other.id, category: 'RENT', description: 'Elsewhere', amount: 1 } });
    const token = await authToken(user);

    const expenses = await get(token, `/gym/${gym.id}/expenses.csv?category=RENT`);
    expect(expenses.text).toContain('March rent');
    expect(expenses.text).not.toContain('Elsewhere');

    for (const kind of ['payments', 'attendance', 'bookings']) {
      const res = await get(token, `/gym/${gym.id}/${kind}.csv`);
      expect(res.status).toBe(200);
      expect(res.text.split('\r\n')).toHaveLength(2);
    }
    expect((await get(token, `/gym/${gym.id}/payments.csv?from=nope`)).status).toBe(400);
  });

  it('refuses another owner\'s gym and non-owners', async () => {
    const { user, gym } = await seedAdmin();
    const { gym: otherGym } = await seedAdmin();
    const { user: member } = await seedMember(gym.id);
    const token = await authToken(user);

    expect((await get(token, `/gym/${otherGym.id}/members.csv`)).status).toBe(403);
    expect((await get(token, '/gym/00000000-0000-4000-8000-000000000000/members.csv')).status).toBe(404);
    expect((await get(token, '/users.csv')).status).toBe(403);
    expect((await get(await authToken(member), `/gym/${gym.id}/members.csv`)).status).toBe(403);
    expect((await agent.get(`/api/exports/gym/${gym.id}/members.csv`)).status).toBe(401);
  });

  it('lets the super admin export users and gyms', async () => {
    const admin = await seedSuperAdmin();
    const { user, gym } = await seedAdmin();
    const token = await authToken(admin);

    const users = await get(token, '/users.csv?role=GYM_ADMIN');
    expect(users.status).toBe(200);
    expect(users.text).toContain(user.email);
    expect(users.text).not.toContain(admin.email);

    const gyms = await get(token, '/gyms.csv');
    expect(gyms.text).toContain(gym.name);
    expect(await prisma.auditLog.count({ where: { action: 'EXPORT_CSV', userId: admin.id } })).toBe(2);
  });
});
