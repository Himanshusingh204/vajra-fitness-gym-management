import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { registerVendor, seedAdmin, seedMember, seedSuperAdmin, authToken, authGet, authPost, uniq } from './helpers';
import { activateSubscription } from '../src/services/subscription.service';
import { readFile } from '../src/services/storage.service';

const agent = request(app);
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 2)]);

const patch = (token: string, body: Record<string, any>) =>
  agent.patch('/api/onboarding/gym').set('Authorization', `Bearer ${token}`).send(body);
const uploadProof = (token: string, kind: string, gymId: string) =>
  agent.post(`/api/uploads?kind=${kind}&gymId=${gymId}`).set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/pdf').send(PDF);

const complete = {
  phone: '9876501234',
  postalCode: '411001',
  facilities: ['Free Weights', 'Cardio'],
  galleryUrls: ['/gym/1.webp'],
  plans: [{ name: 'Monthly', duration: 30, price: 1500 }],
};

// A fresh owner whose application is filled in and has both proofs uploaded.
const readyOwner = async (gymName: string) => {
  const reg = await registerVendor({ gymName, city: 'Nashik' });
  const token = reg.body.token as string;
  const gymId = (await authGet(token, '/api/onboarding/gym')).body.gym.id as string;
  expect((await patch(token, { ...complete, phone: `98${Math.floor(10000000 + Math.random() * 89999999)}` })).status).toBe(200);
  expect((await uploadProof(token, 'ID_PROOF', gymId)).status).toBe(201);
  expect((await uploadProof(token, 'BUSINESS_PROOF', gymId)).status).toBe(201);
  return { token, gymId };
};

describe('Gym onboarding', () => {
  it('starts a new gym as a draft and refuses an incomplete submit', async () => {
    const reg = await registerVendor({ gymName: 'Draft Den', city: 'Nashik' });
    expect(reg.status).toBe(201);
    const token = reg.body.token;

    const app1 = await authGet(token, '/api/onboarding/gym');
    expect(app1.status).toBe(200);
    expect(app1.body.gym).toMatchObject({ name: 'Draft Den', status: 'DRAFT' });
    expect(app1.body.request).toBeNull();

    const res = await authPost(token, '/api/onboarding/gym/submit', {});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INCOMPLETE');
    const paths = res.body.issues.map((i: any) => i.path);
    expect(paths).toEqual(expect.arrayContaining(['phone', 'postalCode', 'facilities', 'galleryUrls', 'plans', 'documents']));
  });

  it('saves drafts, keeps plan ids and validates step data', async () => {
    const token = (await registerVendor({ gymName: 'Plan Place', city: 'Nashik' })).body.token;

    const first = await patch(token, { description: 'Open floor', plans: [{ name: 'Monthly', duration: 30, price: 1200 }] });
    expect(first.status).toBe(200);
    expect(first.body.gym.description).toBe('Open floor');
    const planId = first.body.plans[0].id;

    const second = await patch(token, { description: '', plans: [{ id: planId, name: 'Monthly', duration: 30, price: 1300 }, { name: 'Yearly', duration: 365, price: 12000 }] });
    expect(second.body.gym.description).toBeNull();
    expect(second.body.plans).toHaveLength(2);
    expect(second.body.plans[0]).toMatchObject({ id: planId, price: 1300 });

    expect((await patch(token, { postalCode: '12' })).status).toBe(400);
    // Fields outside the schema, like status, are dropped.
    expect((await patch(token, { status: 'APPROVED' })).body.gym.status).toBe('DRAFT');
  });

  it('goes to review, back for changes, and is approved', async () => {
    const { token, gymId } = await readyOwner('Steel Yard');
    const admin = await seedSuperAdmin();
    const adminToken = await authToken(admin);

    const submitted = await authPost(token, '/api/onboarding/gym/submit', {});
    expect(submitted.status).toBe(200);
    expect(submitted.body.gym.status).toBe('PENDING_REVIEW');
    expect(submitted.body.request).toMatchObject({ status: 'PENDING_REVIEW' });
    expect(submitted.body.request.ref).toMatch(/^APR-\d{4}-\d{6}$/);
    expect(await prisma.notification.count({ where: { userId: admin.id, link: '/admin/approvals' } })).toBe(1);

    // Locked while the admin looks at it.
    expect((await patch(token, { description: 'late edit' })).status).toBe(409);
    expect((await authPost(token, '/api/onboarding/gym/submit', {})).status).toBe(409);

    const inbox = await authGet(adminToken, '/api/admin/approvals');
    const item = inbox.body.find((r: any) => r.gymId === gymId);
    expect(item).toMatchObject({ type: 'GYM_REGISTRATION', proposedValue: { name: 'Steel Yard', postalCode: '411001' } });
    expect(item.documents.map((d: any) => d.document.kind).sort()).toEqual(['BUSINESS_PROOF', 'ID_PROOF']);
    const link = await authGet(adminToken, `/api/uploads/${item.documents[0].document.id}/link`);
    expect(link.status).toBe(200);

    const decide = (body: Record<string, any>) => authPost(adminToken, `/api/admin/approvals/${item.id}/decide`, body);
    expect((await decide({ decision: 'CHANGES_REQUESTED' })).status).toBe(400);
    expect((await decide({ decision: 'CHANGES_REQUESTED', note: 'Add a clearer shop licence' })).status).toBe(200);

    const back = await authGet(token, '/api/onboarding/gym');
    expect(back.body.gym.status).toBe('CHANGES_REQUESTED');
    expect(back.body.request).toMatchObject({ status: 'CHANGES_REQUESTED', reviewNote: 'Add a clearer shop licence' });

    expect((await patch(token, { description: 'Now with a sauna' })).status).toBe(200);
    expect((await uploadProof(token, 'BUSINESS_PROOF', gymId)).status).toBe(201);
    const resubmitted = await authPost(token, '/api/onboarding/gym/submit', {});
    expect(resubmitted.status).toBe(200);
    expect(resubmitted.body.request.id).toBe(item.id);

    const stored = await prisma.approvalRequest.findUnique({ where: { id: item.id }, include: { documents: true, events: true } });
    expect(stored).toMatchObject({ status: 'PENDING_REVIEW', currentValue: { description: null }, proposedValue: { description: 'Now with a sauna' } });
    expect(stored!.documents).toHaveLength(2);
    expect(stored!.events.map((e) => e.toStatus)).toEqual(['PENDING_REVIEW', 'CHANGES_REQUESTED', 'PENDING_REVIEW']);

    expect((await decide({ decision: 'APPROVED' })).status).toBe(200);
    expect(await prisma.gym.findUnique({ where: { id: gymId } })).toMatchObject({ status: 'APPROVED', isApproved: true });
    const ownerId = (await prisma.gym.findUnique({ where: { id: gymId } }))!.ownerId;
    expect(await prisma.notification.findFirst({ where: { userId: ownerId, title: 'Your gym is approved' } })).not.toBeNull();
    expect((await decide({ decision: 'REJECTED' })).status).toBe(409);
  });

  it('rejects an application and keeps the gym off the directory', async () => {
    const { token, gymId } = await readyOwner('Gone Gym');
    await authPost(token, '/api/onboarding/gym/submit', {});
    const adminToken = await authToken(await seedSuperAdmin());
    const req = await prisma.approvalRequest.findFirstOrThrow({ where: { gymId, type: 'GYM_REGISTRATION' } });

    expect((await authPost(adminToken, `/api/admin/approvals/${req.id}/decide`, { decision: 'REJECTED', note: 'Documents do not match' })).status).toBe(200);
    expect(await prisma.gym.findUnique({ where: { id: gymId } })).toMatchObject({ status: 'REJECTED', isApproved: false });
    expect((await authPost(token, '/api/onboarding/gym/submit', {})).status).toBe(409);
  });

  it('blocks a submit that copies another gym', async () => {
    const { gym: existing } = await seedAdmin();
    const { token } = await readyOwner('Copy Cat');
    await patch(token, { name: existing.name, city: existing.city });

    const res = await authPost(token, '/api/onboarding/gym/submit', {});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_GYM');
  });

  it('is only open to the gym owner, for their own documents', async () => {
    const { gym } = await seedAdmin();
    const member = await seedMember(gym.id);
    expect((await authGet(await authToken(member.user), '/api/onboarding/gym')).status).toBe(403);
    expect((await authGet(await authToken(await seedSuperAdmin()), '/api/onboarding/gym')).status).toBe(403);

    const one = await readyOwner('Owner One');
    const two = await readyOwner('Owner Two');
    const doc = (await authGet(one.token, '/api/onboarding/gym')).body.documents[0];
    expect((await agent.delete(`/api/onboarding/documents/${doc.id}`).set('Authorization', `Bearer ${two.token}`)).status).toBe(404);
    expect((await agent.delete(`/api/onboarding/documents/${doc.id}`).set('Authorization', `Bearer ${one.token}`)).status).toBe(204);
    expect((await authGet(one.token, '/api/onboarding/gym')).body.documents).toHaveLength(1);
  });

  it('answers 409, not 500, when the same email registers twice at once', async () => {
    const email = uniq('race');
    const results = await Promise.all([registerVendor({ email, gymName: 'Race One' }), registerVendor({ email, gymName: 'Race Two' })]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('does not approve a gym when its subscription is activated', async () => {
    const { gym } = await seedAdmin({ approved: false, subscription: false });
    const plan = await prisma.saaSPlan.create({ data: { name: `Basic ${gym.id}`, code: `b${gym.id.slice(0, 8)}`, monthlyPrice: 999, features: '[]' } });
    const sub = await prisma.gymSubscription.create({
      data: { gymId: gym.id, planId: plan.id, status: 'PENDING', amount: 999, startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000) },
    });
    await activateSubscription(sub.id);
    expect(await prisma.gym.findUnique({ where: { id: gym.id } })).toMatchObject({ status: 'PENDING_REVIEW', isApproved: false });
  });

  it('approves through the open application when the admin uses the Gyms tab', async () => {
    const { token, gymId } = await readyOwner('Tab Approved');
    await authPost(token, '/api/onboarding/gym/submit', {});
    const adminToken = await authToken(await seedSuperAdmin());

    const res = await request(app).put(`/api/admin/gyms/${gymId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(await prisma.gym.findUnique({ where: { id: gymId } })).toMatchObject({ status: 'APPROVED', isApproved: true });
    expect(await prisma.approvalRequest.findFirst({ where: { gymId, type: 'GYM_REGISTRATION' } })).toMatchObject({ status: 'APPROVED', openKey: null });
  });

  it('deletes a removed gallery photo and its file, for the owner only', async () => {
    const { token, gymId } = await readyOwner('Photo Fix');
    const up = await agent.post(`/api/uploads?kind=GALLERY&gymId=${gymId}`).set('Authorization', `Bearer ${token}`).set('Content-Type', 'image/png').send(PNG);
    const url = `/api/images/${up.body.id}`;
    await patch(token, { galleryUrls: ['/gym/1.webp', url], imageUrl: url });
    expect((await agent.get(url)).status).toBe(200);

    const other = await readyOwner('Photo Thief');
    expect((await agent.delete(`/api/onboarding/documents/${up.body.id}`).set('Authorization', `Bearer ${other.token}`)).status).toBe(404);

    expect((await agent.delete(`/api/onboarding/documents/${up.body.id}`).set('Authorization', `Bearer ${token}`)).status).toBe(204);
    expect(await prisma.gym.findUnique({ where: { id: gymId } })).toMatchObject({ galleryUrls: ['/gym/1.webp'], imageUrl: null });
    expect(await prisma.document.findUnique({ where: { id: up.body.id } })).toMatchObject({ status: 'DELETED' });
    const key = (await prisma.document.findUniqueOrThrow({ where: { id: up.body.id } })).storageKey;
    await expect(readFile(key)).rejects.toThrow();
    expect((await agent.get(url)).status).toBe(404);
  });

  it('lists the platform facilities publicly', async () => {
    await prisma.facility.createMany({ data: [{ name: 'Sauna' }, { name: 'Cardio' }], skipDuplicates: true });
    const res = await agent.get('/api/public/facilities');
    expect(res.status).toBe(200);
    expect(res.body.map((f: any) => f.name)).toEqual(expect.arrayContaining(['Cardio', 'Sauna']));
  });

  it('does not send a profile change back for changes', async () => {
    const { user } = await seedAdmin();
    const token = await authToken(user);
    await agent.put('/api/gym/my-branch').set('Authorization', `Bearer ${token}`).send({ name: 'Renamed Club' });
    const req = await prisma.approvalRequest.findFirstOrThrow({ where: { requesterId: user.id, type: 'GYM_PROFILE_CHANGE' } });
    const adminToken = await authToken(await seedSuperAdmin());
    const res = await authPost(adminToken, `/api/admin/approvals/${req.id}/decide`, { decision: 'CHANGES_REQUESTED', note: 'Why?' });
    expect(res.status).toBe(409);
  });
});
