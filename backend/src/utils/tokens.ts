import crypto from 'crypto';

export const generateSecureToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

// One-time and refresh tokens are stored only as this hash; the raw token goes to the user.
export const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

export const TOKEN_TTL = {
  activation: 7 * 24 * 60 * 60 * 1000, // 7 days
  passwordReset: 60 * 60 * 1000, // 1 hour
};
