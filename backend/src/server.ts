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
});

process.on('SIGTERM', async () => {
  server.close(async () => {
    await redis?.quit().catch(() => undefined);
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
