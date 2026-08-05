export const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return secret;
})();

export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
