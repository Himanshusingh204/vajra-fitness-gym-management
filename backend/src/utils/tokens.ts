import crypto from 'crypto';

export const generateSecureToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

export const TOKEN_TTL = {
  activation: 7 * 24 * 60 * 60 * 1000, // 7 days
  passwordReset: 60 * 60 * 1000, // 1 hour
};
