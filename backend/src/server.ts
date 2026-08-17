import { app } from './app';
import { prisma } from './utils/prisma';
import { logger } from './utils/logger';
import { redis, isRedisAvailable } from './utils/redis';
import { runAllJobs, JOB_INTERVAL_MS } from './jobs/scheduler';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info('server started', { service: 'vajra-fitness-backend', port: PORT, nodeEnv: process.env.NODE_ENV, redis: isRedisAvailable() ? 'connected' : 'fallback-in-memory' });

  // Background jobs: run once at boot, then hourly. All jobs are idempotent.
  // See backend/src/jobs/scheduler.ts for job definitions (expiry sync, reminders).
  runAllJobs()
    .then((r) => logger.info('background jobs completed', {
      expiredMemberships: r.expired,
      expiryReminders: r.expiryNudges,
      feeReminders: r.feeNudges,
      expiredSubscriptions: r.subscriptionLifecycle.expired,
      gracePeriodSubscriptions: r.subscriptionLifecycle.gracePeriod,
      failedPaymentOrders: r.paymentReconciliation.failedOrders,
      escalatedFees: r.paymentReconciliation.escalatedFees,
      dunningReminders: r.dunning.dunningReminders,
      dunningEscalated: r.dunning.escalatedToPastDue,
    }))
    .catch((err) => logger.errorWith('background jobs boot run failed', err));
  setInterval(() => {
    runAllJobs().catch((err) => logger.errorWith('background jobs interval run failed', err));
  }, JOB_INTERVAL_MS);

  // Neon (and similar serverless Postgres) auto-suspends the compute after a
  // few minutes idle; the next query then pays a multi-second cold-start
  // tax on top of normal query time — this is the dominant cause of
  // "randomly slow" requests observed in testing, far more than any single
  // query's own cost. A cheap keep-alive ping well inside that idle window
  // keeps the compute warm during active use. This only runs in this
  // always-on process — it does nothing for the Vercel serverless
  // deployment (api/index.ts), which has no persistent process to host an
  // interval; that path should rely on a paid Neon tier with autosuspend
  // disabled, or accept the cold-start cost as inherent to serverless.
  setInterval(() => {
    prisma.$queryRaw`SELECT 1`.catch(() => {
      // Best-effort — a failed ping just means the next real query pays
      // the cold-start cost, same as if this didn't exist.
    });
  }, 4 * 60 * 1000);
});

process.on('SIGTERM', async () => {
  server.close(async () => {
    await redis?.quit().catch(() => undefined);
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
