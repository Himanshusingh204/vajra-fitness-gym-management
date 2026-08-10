import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '../utils/redisRateLimitStore';

// Rate limiters are disabled in tests: supertest shares a single IP and the
// per-email lockout is covered directly by auth tests.
const isTest = process.env.NODE_ENV === 'test';
const bypass = (_req: any, _res: any, next: any) => next();

// Generic auth endpoints limiter (register / refresh)
export const authLimiter = isTest ? bypass : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('auth'),
  message: { error: 'Too many attempts, please try again later.' },
});

// Strict limiter for credential submission.
// Per-IP cap is generous because the per-email lockout (5 failures) is the
// primary brute-force guard; this catches distributed hammering.
export const loginLimiter = isTest ? bypass : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('login'),
  message: { error: 'Too many login attempts, please try again later.' },
});

// Public write endpoints (contact / enquiry forms)
export const publicWriteLimiter = isTest ? bypass : rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('publicWrite'),
  message: { error: 'Too many submissions, please try again later.' },
});
