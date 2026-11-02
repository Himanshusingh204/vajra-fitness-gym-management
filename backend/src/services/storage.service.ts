import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { JWT_SECRET } from '../utils/env';

// shortcut: files sit on this server's disk under UPLOAD_DIR, which serverless
// hosts (Vercel) do not keep. Before uploads go live there, swap these five
// functions for Cloudflare R2 (presigned PUT/GET); callers only see keys and links.
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));

// Keys are always generated here, so anything else (like "../") is refused.
const KEY_PATTERN = /^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/;

const pathFor = (key: string) => {
  if (!KEY_PATTERN.test(key)) throw new Error('Invalid storage key');
  return path.join(UPLOAD_DIR, key);
};

export const saveFile = async (data: Buffer, meta: { ext: 'pdf' | 'jpg' | 'png' | 'webp' }) => {
  const key = `${crypto.randomUUID()}.${meta.ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(pathFor(key), data, { flag: 'wx' });
  return key;
};

export const readFile = (key: string) => fs.readFile(pathFor(key));

export const deleteFile = (key: string) => fs.rm(pathFor(key), { force: true });

const LINK_TTL_MS = 5 * 60 * 1000;

type DownloadFile = { key: string; mime: string; filename: string };

// The "file:" prefix keeps these signatures from ever matching a JWT signed with the same secret.
const sign = (payload: string) => crypto.createHmac('sha256', JWT_SECRET).update(`file:${payload}`).digest('base64url');

// A link anyone can open until it expires, like a presigned URL.
export const createDownloadToken = (file: DownloadFile, ttlMs = LINK_TTL_MS) => {
  const payload = Buffer.from(JSON.stringify({ ...file, exp: Date.now() + ttlMs })).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

export const readDownloadToken = (token: string): DownloadFile | null => {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const { key, mime, filename, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof exp !== 'number' || exp < Date.now()) return null;
    return { key, mime, filename };
  } catch {
    return null;
  }
};
