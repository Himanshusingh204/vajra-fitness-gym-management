import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { Prisma } from '@prisma/client';
import { prisma } from './utils/prisma';
import { logger } from './utils/logger';
import { requestContextMiddleware } from './middlewares/requestContext.middleware';
import { metricsMiddleware, metricsHandler } from './utils/metrics';
import { requireValidSubscription, requireWriteAccess } from './middlewares/subscription.middleware';
import { RedisRateLimitStore } from './utils/redisRateLimitStore';
import { redis, isRedisAvailable } from './utils/redis';
import { tenantWriteLimiter } from './middlewares/rateLimit.middleware';
import { runScheduledJobs } from './jobs/scheduler';

export const app = express();

// Allowed browser origins for CORS
const allowedOrigins = Array.from(
  new Set([
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : []),
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:4173',
  ]),
);

import authRoutes from './routes/auth.routes';
import membershipPlanRoutes from './routes/membershipPlan.routes';
import memberRoutes from './routes/member.routes';
import staffRoutes from './routes/staff.routes';
import feeRoutes from './routes/fee.routes';
import attendanceRoutes from './routes/attendance.routes';
import workoutRoutes from './routes/workout.routes';
import enquiryRoutes from './routes/enquiry.routes';
import adminRoutes from './routes/admin.routes';
import gymRoutes from './routes/gym.routes';
import publicRoutes from './routes/public.routes';
import supportRoutes from './routes/support.routes';
import bookingRoutes from './routes/booking.routes';
import progressRoutes from './routes/progress.routes';
import nutritionRoutes from './routes/nutrition.routes';
import membershipRoutes from './routes/membership.routes';
import notificationRoutes from './routes/notification.routes';
import saasRoutes from './routes/saas.routes';
import reportsRoutes from './routes/reports.routes';
import noticeRoutes from './routes/notice.routes';
import paymentRoutes from './routes/payment.routes';
import expenseRoutes from './routes/expense.routes';
import inventoryRoutes from './routes/inventory.routes';
import equipmentRoutes from './routes/equipment.routes';
import classRoutes from './routes/class.routes';
import payslipRoutes from './routes/payslip.routes';
import referralRoutes from './routes/referral.routes';
import branchRoutes from './routes/branch.routes';

// Behind a reverse proxy
const trustProxyHops = Number(process.env.TRUST_PROXY);
if (!Number.isNaN(trustProxyHops) && trustProxyHops > 0) {
  app.set('trust proxy', trustProxyHops);
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
      frameSrc: ["'self'", 'https://checkout.razorpay.com', 'https://api.razorpay.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false,
}));

app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), usb=(), payment=()');
  next();
});

// Correlation-id + structured request logging (must run before everything).
app.use(requestContextMiddleware);

// Prometheus request metrics (route + status labels).
app.use(metricsMiddleware);

app.use(cookieParser());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client'],
}));

// Razorpay webhooks must receive the RAW body so the signature can be verified
// against the exact bytes that were signed. This must be mounted BEFORE the
// JSON parser, otherwise the body is consumed and signature validation fails.
app.use('/api/payments/webhook', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const isTest = process.env.NODE_ENV === 'test';

// Redis-backed so the limit is shared across serverless invocations/instances
// instead of resetting every cold start (the default in-memory store would
// make this a no-op in production and leave the API with no real DDoS floor).
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('global'),
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', isTest ? (_req, _res, next) => next() : limiter);

// ========================================
// PUBLIC ROUTES (no subscription check)
// ========================================
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/payments', paymentRoutes);
const DB_CHECK_TIMEOUT_MS = 2000;

const checkDatabase = async (): Promise<'up' | 'down'> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), DB_CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
};

// 'memory' means no REDIS_URL, so rate limits and cache live in this instance.
const cacheStatus = () => (redis === null ? 'memory' : isRedisAvailable() ? 'up' : 'down');

app.get('/api/health', async (_req, res) => {
  const database = await checkDatabase();
  res.status(database === 'up' ? 200 : 503).json({
    status: database === 'up' ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    dependencies: { database, cache: cacheStatus() },
  });
});

// Readiness endpoint for deployment orchestration
app.use('/api/ready', async (_req, res) => {
  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ready: false, error: 'Database not available' });
  }
});

// Constant-time check of an "Authorization: Bearer <secret>" header. Hashing
// first keeps the comparison length-independent.
const hasBearer = (header: string | undefined, secret: string) => {
  const given = crypto.createHash('sha256').update(header ?? '').digest();
  const expected = crypto.createHash('sha256').update(`Bearer ${secret}`).digest();
  return crypto.timingSafeEqual(given, expected);
};

// Prometheus metrics for scraping (Grafana/Prometheus). Optional bearer-token
// protection via METRICS_TOKEN when set.
app.use('/metrics', async (req, res, next) => {
  const token = process.env.METRICS_TOKEN;
  if (token && !hasBearer(req.headers.authorization, token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return metricsHandler(req, res);
});

// Scheduled jobs for hosts without a long-running process. Vercel Cron sends
// a GET with "Authorization: Bearer $CRON_SECRET".
const runCron = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || !hasBearer(req.headers.authorization, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await runScheduledJobs();
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
};
app.get('/api/internal/cron', runCron);
app.post('/api/internal/cron', runCron);

// ========================================
// PLATFORM ADMIN ROUTES (Super Admin only, no subscription check)
// ========================================
app.use('/api/admin', adminRoutes);
app.use('/api/saas', saasRoutes);

// ========================================
// TENANT ROUTES (subscription-checked)
// ========================================
// Apply subscription check to all tenant routes. Super Admins bypass it.
// requireWriteAccess blocks mutations once a subscription is read-only
// (expired, suspended or no plan) while still letting GETs render the dashboard.
const tenant = [requireValidSubscription, tenantWriteLimiter, requireWriteAccess];
// A read-only gym can still dismiss notifications and contact support.
const tenantAlwaysWritable = [requireValidSubscription, tenantWriteLimiter];

app.use('/api/members', ...tenant, memberRoutes);
app.use('/api/plans', ...tenant, membershipPlanRoutes);
app.use('/api/staff', ...tenant, staffRoutes);
app.use('/api/fees', ...tenant, feeRoutes);
app.use('/api/attendance', ...tenant, attendanceRoutes);
app.use('/api/workouts', ...tenant, workoutRoutes);
app.use('/api/enquiries', ...tenant, enquiryRoutes);
app.use('/api/gym', ...tenant, gymRoutes);
app.use('/api/support', ...tenantAlwaysWritable, supportRoutes);
app.use('/api/bookings', ...tenant, bookingRoutes);
app.use('/api/progress', ...tenant, progressRoutes);
app.use('/api/nutrition', ...tenant, nutritionRoutes);
app.use('/api/memberships', ...tenant, membershipRoutes);
app.use('/api/notifications', ...tenantAlwaysWritable, notificationRoutes);
app.use('/api/reports', ...tenant, reportsRoutes);
app.use('/api/notices', ...tenant, noticeRoutes);
app.use('/api/expenses', ...tenant, expenseRoutes);
app.use('/api/inventory', ...tenant, inventoryRoutes);
app.use('/api/equipment', ...tenant, equipmentRoutes);
app.use('/api/classes', ...tenant, classRoutes);
app.use('/api/payslips', ...tenant, payslipRoutes);
app.use('/api/referrals', ...tenant, referralRoutes);
app.use('/api/branches', ...tenant, branchRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Resource not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'A record with that value already exists' });
    if (err.code === 'P2023') return res.status(400).json({ error: 'Invalid identifier' });
    return res.status(400).json({ error: 'Bad request' });
  }
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Not allowed by CORS' });
  }
  logger.errorWith('unhandled error', err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

export default app;
