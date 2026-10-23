import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisRateLimitStore } from '../utils/redisRateLimitStore';
import type { SubscriptionRequest } from './subscription.middleware';

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

// Authenticated user mutations (booking status changes, enquiry updates, etc.).
// 60 writes / 15 min is generous for a human while still throttling scripts.
export const userWriteLimiter = isTest ? bypass : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('userWrite'),
  message: { error: 'Too many requests, please slow down.' },
});

// Logout — prevents cookie-flooding / token-revocation spam. Light touch since
// logout must remain cheap and idempotent.
export const logoutLimiter = isTest ? bypass : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('logout'),
  message: { error: 'Too many requests, please try again later.' },
});

// Mutations on tenant routes, keyed by the caller's user id (set by
// requireValidSubscription) so one office IP shared by staff is not one bucket.
export const tenantWriteLimiter = isTest ? bypass : rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('tenantWrite'),
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  keyGenerator: (req) => {
    const callerId = (req as SubscriptionRequest).callerId;
    return callerId ? `user:${callerId}` : `ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
  message: { error: 'Too many requests, please slow down.' },
});
