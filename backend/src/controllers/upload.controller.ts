import crypto from 'crypto';
import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { canAccessGym } from '../utils/tenant';
import { saveFile, deleteFile, readFile, createDownloadToken, readDownloadToken } from '../services/storage.service';

const MB = 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_RULES = {
  image: { maxBytes: 3 * MB, types: IMAGE_TYPES },
  document: { maxBytes: 5 * MB, types: [...IMAGE_TYPES, 'application/pdf'] },
};
const EXTENSIONS = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
type FileType = keyof typeof EXTENSIONS;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// What the bytes really are, whatever the client says they are.
const detectType = (data: Buffer): FileType | null => {
  if (data.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png';
  if (data.subarray(0, 4).toString('latin1') === 'RIFF' && data.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
};

// POST /api/uploads?kind=GALLERY&gymId=... with the file bytes as the body and
// its type in Content-Type.
export const uploadFile = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { kind, gymId } = req.query as { kind: string; gymId?: string };
  const data = req.body;
  if (!Buffer.isBuffer(data) || data.length === 0) {
    return res.status(400).json({ error: 'Send the file bytes as the request body', code: 'EMPTY_FILE' });
  }

  const rules = kind === 'GALLERY' ? UPLOAD_RULES.image : UPLOAD_RULES.document;
  if (data.length > rules.maxBytes) {
    return res.status(413).json({ error: `File is larger than ${rules.maxBytes / MB} MB`, code: 'FILE_TOO_LARGE' });
  }
  const type = detectType(data);
  const declared = req.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (!type || !rules.types.includes(type) || declared !== type) {
    return res.status(415).json({ error: `Allowed files: ${rules.types.join(', ')}`, code: 'UNSUPPORTED_FILE' });
  }
  if (gymId && !(await canAccessGym(req.user, gymId, ['STAFF', 'TRAINER']))) {
    return res.status(403).json({ error: 'You cannot add files to this gym', code: 'FORBIDDEN' });
  }

  const storageKey = await saveFile(data, { ext: EXTENSIONS[type] });
  try {
    const doc = await prisma.document.create({
      data: {
        kind,
        storageKey,
        mime: type,
        sizeBytes: data.length,
        sha256: crypto.createHash('sha256').update(data).digest('hex'),
        ownerUserId: userId,
        gymId: gymId ?? null,
      },
    });
    const { storageKey: _key, sha256: _hash, ...shown } = doc;
    res.status(201).json(shown);
  } catch (err) {
    await deleteFile(storageKey).catch(() => undefined);
    throw err;
  }
};

// GET /api/uploads/:id/link: a 5-minute link for the uploader, the owner of the
// document's gym, or a super admin. Anyone else gets a 404.
export const getDownloadLink = async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const doc = await prisma.document.findUnique({ where: { id: req.params.id as string } });
  const allowed =
    !!doc &&
    doc.status !== 'DELETED' &&
    (doc.ownerUserId === user.userId || user.role === 'SUPER_ADMIN' || (!!doc.gymId && (await canAccessGym(user, doc.gymId))));
  if (!doc || !allowed) return res.status(404).json({ error: 'Document not found', code: 'NOT_FOUND' });

  const filename = `${doc.kind.toLowerCase()}-${doc.id.slice(0, 8)}.${EXTENSIONS[doc.mime as FileType]}`;
  const token = createDownloadToken({ key: doc.storageKey, mime: doc.mime, filename });
  res.json({
    url: `${req.protocol}://${req.get('host')}/api/files/${token}`,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });
};

// GET /api/files/:token. The signed token is the only permission check.
export const serveFile = async (req: Request, res: Response) => {
  const file = readDownloadToken(req.params.token as string);
  const data = file ? await readFile(file.key).catch(() => null) : null;
  if (!file || !data) return res.status(404).json({ error: 'This link has expired or is invalid', code: 'LINK_INVALID' });

  res.set({
    'Content-Type': file.mime,
    // PDFs download; images can show inline in an <img>.
    'Content-Disposition': `${file.mime === 'application/pdf' ? 'attachment' : 'inline'}; filename="${file.filename}"`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cache-Control': 'private, max-age=300',
  });
  res.send(data);
};

// GET /api/images/:id: gallery photos are public, so they get a stable URL the
// gym page can use. Every other kind of file stays behind signed links.
export const servePublicImage = async (req: Request, res: Response) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id as string } });
  const data = doc && doc.kind === 'GALLERY' && doc.status !== 'DELETED' ? await readFile(doc.storageKey).catch(() => null) : null;
  if (!doc || !data) return res.status(404).json({ error: 'Image not found' });

  res.set({
    'Content-Type': doc.mime,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cache-Control': 'public, max-age=86400',
  });
  res.send(data);
};
