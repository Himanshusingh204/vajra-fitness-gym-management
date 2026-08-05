import crypto from 'crypto';
import { prisma } from '../utils/prisma';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

// Issues a new refresh token for a user. Returns the raw token to hand to the client
// (only its SHA-256 hash is stored server-side).
export const generateRefreshToken = async (userId: string): Promise<string> => {
  const raw = crypto.randomBytes(48).toString('hex');
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(raw),
      familyId: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userId,
    },
  });
  return raw;
};

export type RotateResult =
  | { ok: true; userId: string; raw: string }
  | { ok: false; reason: 'expired' | 'revoked' | 'reuse' };

// Rotates a refresh token. On success a new token in the same family is issued and the old
// one is marked used. Presenting an already-used token is treated as theft: the entire
// family is revoked and the user must log in again.
export const rotateRefreshToken = async (raw: string): Promise<RotateResult> => {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!record) return { ok: false, reason: 'revoked' };
  if (record.revokedAt) return { ok: false, reason: 'revoked' };
  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return { ok: false, reason: 'expired' };
  }

  // Atomically claim this token as used. If it is already used, another request (or a thief)
  // rotated it first => revoke the whole family.
  const claimed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (claimed.count === 0) {
      await tx.refreshToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { claimed: false as const };
    }

    const raw2 = crypto.randomBytes(48).toString('hex');
    await tx.refreshToken.create({
      data: {
        tokenHash: hashToken(raw2),
        familyId: record.familyId,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        userId: record.userId,
      },
    });
    return { claimed: true as const, raw2 };
  });

  if (!claimed.claimed) return { ok: false, reason: 'reuse' };
  return { ok: true, userId: record.userId, raw: claimed.raw2 };
};

// Revokes a single refresh token (logout).
export const revokeRefreshToken = async (raw: string): Promise<void> => {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (record) {
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
  }
};

// Revokes every outstanding refresh token for a user (password change / security event).
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
