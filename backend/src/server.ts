import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { Prisma } from '@prisma/client';
import { prisma } from './utils/prisma';

const app = express();
const PORT = process.env.PORT || 5000;

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

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'https://app.vajrafitness.in',
];

// Behind a reverse proxy (nginx, Cloud Run, etc.) client IPs are forwarded via
// X-Forwarded-For. Trusting the proxy lets rate limiting key on real client IPs.
// Set TRUST_PROXY to the number of trusted proxy hops (usually 1) in deployment.
const trustProxyHops = Number(process.env.TRUST_PROXY);
if (!Number.isNaN(trustProxyHops) && trustProxyHops > 0) {
  app.set('trust proxy', trustProxyHops);
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cookieParser());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Minimal request logger (method, path, status, duration)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const isVerbose = process.env.NODE_ENV !== 'production' || res.statusCode >= 400;
    if (isVerbose) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/plans', membershipPlanRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gym', gymRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/saas', saasRoutes);
app.use('/api/reports', reportsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

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
  console.error('[Error]', err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`[Vajra Backend] Running on port ${PORT} — ${new Date().toLocaleString('en-IN')}`);
});

process.on('SIGTERM', async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
