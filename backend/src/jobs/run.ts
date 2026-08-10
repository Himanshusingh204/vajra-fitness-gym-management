import { prisma } from '../utils/prisma';
import { runAllJobs } from './scheduler';

// Manual CLI entry: `npm run jobs` — runs every background job once and exits.
// Useful for deployments on a timer or after a boot crash.
runAllJobs()
  .then((r) => {
    const line = [
      `expired memberships: ${r.expired}`,
      `expiry reminders: ${r.expiryNudges}`,
      `fee reminders: ${r.feeNudges}`,
      `payment reconciliation: ${r.paymentReconciliation.failedOrders} failed, ${r.paymentReconciliation.escalatedFees} fees overdue`,
      `subscription dunning: ${r.dunning.dunningReminders} reminders, ${r.dunning.escalatedToPastDue} escalated`,
    ];
    console.log(`[Jobs] ${line.join(' | ')}`);
  })
  .catch((err) => {
    console.error('[Jobs] run failed', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
