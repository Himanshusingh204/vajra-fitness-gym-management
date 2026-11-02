import { Job, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { sendMail } from '../utils/email';
import { logger } from '../utils/logger';

// Work that should not hold up a request (emails, later exports and payouts)
// goes in the Job table and runs on the next scheduler tick or cron call.
// Don't put one-time tokens in a payload: payloads are stored in plain text.
const handlers: Record<string, (payload: any) => Promise<unknown>> = {
  EMAIL: (p: { to: string; subject: string; html: string }) => sendMail(p.to, p.subject, p.html),
};

const BATCH_SIZE = 20;
// A worker that died mid-job leaves it RUNNING; after this long it is retried.
const STUCK_AFTER_MS = 15 * 60 * 1000;

// 1, 4, 16, 64 minutes... capped at a day.
const retryDelayMs = (attempts: number) => Math.min(4 ** (attempts - 1) * 60_000, 24 * 60 * 60_000);

export const enqueueJob = (type: string, payload: Prisma.InputJsonValue, opts: { runAt?: Date; maxAttempts?: number } = {}) =>
  prisma.job.create({
    data: { type, payload, ...(opts.runAt ? { runAt: opts.runAt } : {}), ...(opts.maxAttempts ? { maxAttempts: opts.maxAttempts } : {}) },
  });

export const runJobs = async () => {
  await prisma.job.updateMany({
    where: { status: 'RUNNING', updatedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) } },
    data: { status: 'QUEUED' },
  });

  // SKIP LOCKED lets the hourly interval and the cron call run at once without
  // taking the same job. Prisma stores DateTime as UTC, hence the AT TIME ZONE.
  const jobs = await prisma.$queryRaw<Job[]>`
    UPDATE "Job" SET "status" = 'RUNNING', "attempts" = "attempts" + 1, "updatedAt" = now() AT TIME ZONE 'UTC'
    WHERE "id" IN (
      SELECT "id" FROM "Job"
      WHERE "status" = 'QUEUED' AND "runAt" <= now() AT TIME ZONE 'UTC'
      ORDER BY "runAt"
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *`;

  let done = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      const handler = handlers[job.type];
      if (!handler) throw new Error(`No handler for job type ${job.type}`);
      await handler(job.payload);
      await prisma.job.update({ where: { id: job.id }, data: { status: 'DONE', lastError: null } });
      done += 1;
    } catch (err) {
      const giveUp = job.attempts >= job.maxAttempts;
      const message = err instanceof Error ? err.message : String(err);
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: giveUp ? 'FAILED' : 'QUEUED',
          lastError: message.slice(0, 1000),
          ...(giveUp ? {} : { runAt: new Date(Date.now() + retryDelayMs(job.attempts)) }),
        },
      });
      if (giveUp) failed += 1;
      logger.warn('job failed', { jobId: job.id, type: job.type, attempts: job.attempts, giveUp, error: message });
    }
  }
  return { picked: jobs.length, done, failed };
};
