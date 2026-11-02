import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedMember, seedSuperAdmin, authToken, authPut, authGet, authPost } from './helpers';

const profile = {
  description: 'Strength floor with coaches all day.',
  openingHours: 'Mon-Sat 6 AM - 10 PM',
  facilities: ['Sauna', 'Free Weights'],
  imageUrl: 'https://cdn.example.com/cover.jpg',
  galleryUrls: ['/gym/1.webp', 'https://cdn.example.com/a.jpg'],
};

describe('Gym profile update', () => {
  it('sends name, address and contact changes to the admin instead of saving them', async () => {
    const { user, gym } = await seedAdmin();
    const token = await authToken(user);

    const res = await authPut(token, '/api/gym/my-branch', { name: 'Peak Club Elite', city: 'Pune', tagline: 'New tagline' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: gym.name, city: gym.city, tagline: 'New tagline' });
    expect(res.body.changeRequest).toMatchObject({ status: 'PENDING_REVIEW', proposedValue: { name: 'Peak Club Elite', city: 'Pune' } });
    expect(res.body.changeRequest.ref).toMatch(/^APR-\d{4}-\d{6}$/);

    // A second edit joins the open request rather than opening another.
    await authPut(token, '/api/gym/my-branch', { email: 'desk@peak.in' });
    const mine = await authGet(token, '/api/gym/my-branch/change-requests');
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].proposedValue).toMatchObject({ name: 'Peak Club Elite', city: 'Pune', email: 'desk@peak.in' });

    const admin = await authToken(await seedSuperAdmin());
    const id = mine.body[0].id;
    expect((await authPost(admin, `/api/admin/approvals/${id}/decide`, { decision: 'APPROVED' })).status).toBe(200);
    expect(await prisma.gym.findUnique({ where: { id: gym.id } })).toMatchObject({ name: 'Peak Club Elite', city: 'Pune', email: 'desk@peak.in' });

    expect((await authPost(admin, `/api/admin/approvals/${id}/decide`, { decision: 'REJECTED' })).status).toBe(409);
    expect((await authPost(token, `/api/admin/approvals/${id}/decide`, { decision: 'APPROVED' })).status).toBe(403);
  });

  it('lets the owner update their own gym and shows it on the public page', async () => {
    const { user, gym } = await seedAdmin();
    const token = await authToken(user);

    const res = await authPut(token, '/api/gym/my-branch', profile);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: gym.id, galleryUrls: profile.galleryUrls, changeRequest: null });

    const pub = await request(app).get(`/api/public/gyms/${gym.id}`);
    expect(pub.body).toMatchObject({ description: profile.description, openingHours: profile.openingHours, galleryUrls: profile.galleryUrls });

    const audit = await prisma.auditLog.findFirst({ where: { action: 'GYM_PROFILE_UPDATED', entityId: gym.id } });
    expect(audit?.userId).toBe(user.id);
  });

  it('never touches another owner\'s gym', async () => {
    const { gym: other } = await seedAdmin();
    const { user: owner, gym: mine } = await seedAdmin();
    const token = await authToken(owner);

    const res = await authPut(token, '/api/gym/my-branch', { id: other.id, ownerId: owner.id, name: 'Taken Over' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(mine.id);
    expect(await prisma.gym.findUnique({ where: { id: other.id } })).toMatchObject({ name: 'Peak Club', ownerId: other.ownerId });

    const { user: member } = await seedMember(other.id);
    expect((await authPut(await authToken(member), '/api/gym/my-branch', { name: 'Nope' })).status).toBe(403);
  });

  it('rejects unsafe or malformed fields', async () => {
    const { user } = await seedAdmin();
    const token = await authToken(user);

    for (const body of [
      { imageUrl: 'javascript:alert(1)' },
      { galleryUrls: ['data:image/png;base64,AAAA'] },
      { galleryUrls: ['/../etc/passwd'] },
      { galleryUrls: Array.from({ length: 13 }, (_, i) => `https://cdn.example.com/${i}.jpg`) },
      { email: 'not-an-email' },
      { phone: 'call me' },
      { openingHours: 'x'.repeat(201) },
    ]) {
      expect((await authPut(token, '/api/gym/my-branch', body)).status, JSON.stringify(body).slice(0, 60)).toBe(400);
    }
  });
});
