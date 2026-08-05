import rateLimit from 'express-rate-limit';

// Generic auth endpoints limiter (register / refresh)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});

// Strict limiter for credential submission.
// Per-IP cap is generous because the per-email lockout (5 failures) is the
// primary brute-force guard; this catches distributed hammering.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

// Public write endpoints (contact / enquiry forms)
export const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions, please try again later.' },
});
