import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { JWT_SECRET } from '../utils/env';

// Files go to Cloudflare R2 when its env vars are set, otherwise to UPLOAD_DIR on
// this server's disk (which serverless hosts like Vercel do not keep).
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));

// Keys are always generated here, so anything else (like "../") is refused.
const KEY_PATTERN = /^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/;

const checkKey = (key: string) => {
  if (!KEY_PATTERN.test(key)) throw new Error('Invalid storage key');
  return key;
};

const pathFor = (key: string) => path.join(UPLOAD_DIR, checkKey(key));

const r2Config = () => {
  const { R2_ACCOUNT_ID: account, R2_ACCESS_KEY_ID: accessKey, R2_SECRET_ACCESS_KEY: secretKey, R2_BUCKET: bucket } = process.env;
  return account && accessKey && secretKey && bucket ? { account, accessKey, secretKey, bucket } : null;
};

const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac('sha256', key).update(data).digest();
const sha256Hex = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');

// S3 API call with an AWS Signature V4 header. R2 uses region "auto".
const r2Request = async (cfg: NonNullable<ReturnType<typeof r2Config>>, method: 'GET' | 'PUT' | 'DELETE', key: string, body?: Buffer) => {
  const host = `${cfg.account}.r2.cloudflarestorage.com`;
  const uri = `/${cfg.bucket}/${checkKey(key)}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body ?? '');
  const canonical = [method, uri, '', `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`, 'host;x-amz-content-sha256;x-amz-date', payloadHash].join('\n');
  const scope = `${day}/auto/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonical)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${cfg.secretKey}`, day), 'auto'), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', signingKey).update(toSign).digest('hex');

  const res = await fetch(`https://${host}${uri}`, {
    method,
    ...(body && { body: new Uint8Array(body) }),
    headers: {
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`,
    },
  });
  if (!res.ok && !(method === 'DELETE' && res.status === 404)) throw new Error(`R2 ${method} failed with ${res.status}`);
  return res;
};

export const saveFile = async (data: Buffer, meta: { ext: 'pdf' | 'jpg' | 'png' | 'webp' }) => {
  const key = `${crypto.randomUUID()}.${meta.ext}`;
  const r2 = r2Config();
  if (r2) {
    await r2Request(r2, 'PUT', key, data);
    return key;
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(pathFor(key), data, { flag: 'wx' });
  return key;
};

export const readFile = async (key: string) => {
  const r2 = r2Config();
  if (!r2) return fs.readFile(pathFor(key));
  return Buffer.from(await (await r2Request(r2, 'GET', key)).arrayBuffer());
};

export const deleteFile = async (key: string) => {
  const r2 = r2Config();
  if (r2) await r2Request(r2, 'DELETE', key);
  else await fs.rm(pathFor(key), { force: true });
};

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
