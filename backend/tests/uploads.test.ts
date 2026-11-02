import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { createDownloadToken } from '../src/services/storage.service';
import { seedAdmin, seedMember, seedSuperAdmin, login } from './helpers';

const agent = request(app);
const tokenFor = async (email: string) => (await login(email)).body.token as string;

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 2)]);

const upload = (token: string, body: Buffer, type: string, query: string) =>
  agent.post(`/api/uploads?${query}`).set('Authorization', `Bearer ${token}`).set('Content-Type', type).send(body);

// supertest buffers binary bodies only when told how to.
const binary = (res: any, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('Uploads', () => {
  it('stores a gallery image for the owner and serves it through a signed link', async () => {
    const { user, gym } = await seedAdmin();
    const token = await tokenFor(user.email);

    const res = await upload(token, PNG, 'image/png', `kind=GALLERY&gymId=${gym.id}`);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ kind: 'GALLERY', mime: 'image/png', sizeBytes: PNG.length, gymId: gym.id, status: 'UPLOADED' });
    expect(res.body.storageKey).toBeUndefined();

    const link = await agent.get(`/api/uploads/${res.body.id}/link`).set('Authorization', `Bearer ${token}`);
    expect(link.status).toBe(200);
    expect(new Date(link.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    const path = new URL(link.body.url).pathname;
    expect(path).toMatch(/^\/api\/files\//);

    const file = await agent.get(path).buffer(true).parse(binary);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect(file.headers['content-disposition']).toMatch(/^inline; filename="gallery-/);
    expect(Buffer.compare(file.body, PNG)).toBe(0);
  });

  it('serves PDFs as attachments', async () => {
    const { user, gym } = await seedAdmin();
    const token = await tokenFor(user.email);
    const res = await upload(token, PDF, 'application/pdf', `kind=GST_CERT&gymId=${gym.id}`);
    expect(res.status).toBe(201);

    const link = await agent.get(`/api/uploads/${res.body.id}/link`).set('Authorization', `Bearer ${token}`);
    const file = await agent.get(new URL(link.body.url).pathname).buffer(true).parse(binary);
    expect(file.headers['content-type']).toBe('application/pdf');
    expect(file.headers['content-disposition']).toMatch(/^attachment; filename="gst_cert-.*\.pdf"$/);
  });

  it('rejects files whose bytes do not match an allowed type', async () => {
    const { user, gym } = await seedAdmin();
    const token = await tokenFor(user.email);

    const fake = await upload(token, Buffer.from('<svg onload=alert(1)>'), 'image/png', `kind=GALLERY&gymId=${gym.id}`);
    expect(fake.status).toBe(415);
    expect(fake.body.code).toBe('UNSUPPORTED_FILE');

    const pdfAsImage = await upload(token, PDF, 'application/pdf', `kind=GALLERY&gymId=${gym.id}`);
    expect(pdfAsImage.status).toBe(415);

    const mislabelled = await upload(token, PNG, 'image/jpeg', `kind=GALLERY&gymId=${gym.id}`);
    expect(mislabelled.status).toBe(415);
    expect(await prisma.document.count()).toBe(0);
  });

  it('rejects images over 3 MB and documents over 5 MB', async () => {
    const { user, gym } = await seedAdmin();
    const token = await tokenFor(user.email);
    const big = (head: Buffer, size: number) => Buffer.concat([head, Buffer.alloc(size - head.length)]);

    const image = await upload(token, big(PNG, 3 * 1024 * 1024 + 1), 'image/png', `kind=GALLERY&gymId=${gym.id}`);
    expect(image.status).toBe(413);
    expect(image.body.code).toBe('FILE_TOO_LARGE');

    const okDoc = await upload(token, big(PDF, 4 * 1024 * 1024), 'application/pdf', `kind=ID_PROOF&gymId=${gym.id}`);
    expect(okDoc.status).toBe(201);

    const doc = await upload(token, big(PDF, 5 * 1024 * 1024 + 1), 'application/pdf', `kind=ID_PROOF&gymId=${gym.id}`);
    expect(doc.status).toBe(413);
  });

  it('needs a login, a known kind and access to the gym', async () => {
    const { user, gym } = await seedAdmin();
    const { gym: otherGym } = await seedAdmin();
    const token = await tokenFor(user.email);

    const anon = await agent.post('/api/uploads?kind=GALLERY').set('Content-Type', 'image/png').send(PNG);
    expect(anon.status).toBe(401);

    const badKind = await upload(token, PNG, 'image/png', `kind=SELFIE&gymId=${gym.id}`);
    expect(badKind.status).toBe(400);

    const otherGymUpload = await upload(token, PNG, 'image/png', `kind=GALLERY&gymId=${otherGym.id}`);
    expect(otherGymUpload.status).toBe(403);
  });

  it('gives links only to the uploader, the gym owner and the super admin', async () => {
    const { user: owner, gym } = await seedAdmin();
    const { user: otherOwner } = await seedAdmin();
    const { user: member } = await seedMember(gym.id);
    const admin = await seedSuperAdmin();

    const memberToken = await tokenFor(member.email);
    const res = await upload(memberToken, PDF, 'application/pdf', 'kind=ID_PROOF');
    expect(res.status).toBe(201);
    // A member's own document is not tied to a gym unless they work there.
    await prisma.document.update({ where: { id: res.body.id }, data: { gymId: gym.id } });

    const linkFor = async (email: string) =>
      (await agent.get(`/api/uploads/${res.body.id}/link`).set('Authorization', `Bearer ${await tokenFor(email)}`)).status;

    expect(await linkFor(member.email)).toBe(200);
    expect(await linkFor(owner.email)).toBe(200);
    expect(await linkFor(admin.email)).toBe(200);
    expect(await linkFor(otherOwner.email)).toBe(404);
  });

  it('refuses tampered and expired file links', async () => {
    const { user, gym } = await seedAdmin();
    const token = await tokenFor(user.email);
    const res = await upload(token, PNG, 'image/png', `kind=GALLERY&gymId=${gym.id}`);
    const doc = await prisma.document.findUniqueOrThrow({ where: { id: res.body.id } });

    const good = createDownloadToken({ key: doc.storageKey, mime: doc.mime, filename: 'a.png' });
    const [payload, sig] = good.split('.');
    const tampered = `${Buffer.from(JSON.stringify({ key: '../../.env', mime: 'text/plain', filename: 'a', exp: Date.now() + 60_000 })).toString('base64url')}.${sig}`;
    expect((await agent.get(`/api/files/${tampered}`)).status).toBe(404);
    expect((await agent.get(`/api/files/${payload}.${'x'.repeat(43)}`)).status).toBe(404);

    const expired = createDownloadToken({ key: doc.storageKey, mime: doc.mime, filename: 'a.png' }, -1000);
    expect((await agent.get(`/api/files/${expired}`)).status).toBe(404);
  });
});
