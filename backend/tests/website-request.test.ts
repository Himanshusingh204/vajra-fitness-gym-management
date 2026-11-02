import { describe, it, expect } from 'vitest';
import { seedAdmin, seedSuperAdmin, login, authGet, authPost, authPut, PASSWORD } from './helpers';
import { prisma } from '../src/utils/prisma';

const tokenFor = async (email: string) => (await login(email, PASSWORD)).body.token;

describe('Gym website requests', () => {
  it('owner submits a request, super admin approves it and the slug goes live', async () => {
    const { user: owner, gym } = await seedAdmin();
    const ownerToken = await tokenFor(owner.email);
    const slug = `peak-${Date.now().toString(36)}`;

    const created = await authPost(ownerToken, '/api/website-requests', { desiredSlug: slug, note: 'Need a site' });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('PENDING');

    const again = await authPost(ownerToken, '/api/website-requests', { desiredSlug: `${slug}-2` });
    expect(again.status).toBe(409);

    const mine = await authGet(ownerToken, '/api/website-requests/mine');
    expect(mine.body).toHaveLength(1);

    const forbidden = await authPut(ownerToken, `/api/website-requests/${created.body.id}/approve`, {});
    expect(forbidden.status).toBe(403);

    const admin = await seedSuperAdmin();
    const adminToken = await tokenFor(admin.email);
    const approved = await authPut(adminToken, `/api/website-requests/${created.body.id}/approve`, {});
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('APPROVED');

    const updated = await prisma.gym.findUnique({ where: { id: gym.id } });
    expect(updated?.subdomain).toBe(slug);
  });
});
