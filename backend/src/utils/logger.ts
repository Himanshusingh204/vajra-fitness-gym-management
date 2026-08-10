import { AsyncLocalStorage } from 'node:async_hooks';

// Dependency-free structured JSON logger with per-request correlation context.
// Every log line carries a correlation id (from AsyncLocalStorage), a level,
// a timestamp, and caller-provided metadata — machine-parseable and safe to
// ship to a log aggregation service as-is.

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level = (process.env.LOG_LEVEL as Level) || 'info';

type LogContext = {
  requestId?: string;
  userId?: string;
  role?: string;
  [key: string]: unknown;
};

export const requestContext = new AsyncLocalStorage<LogContext>();

export const getCorrelationId = (): string | undefined => requestContext.getStore()?.requestId;

const write = (level: Level, msg: string, meta?: Record<string, unknown>) => {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const ctx = requestContext.getStore() ?? {};
  const line = {
    level,
    time: new Date().toISOString(),
    msg,
    requestId: ctx.requestId,
    ...(ctx.userId ? { userId: ctx.userId } : {}),
    ...(ctx.role ? { role: ctx.role } : {}),
    ...(meta ?? {}),
  };
  const output = JSON.stringify(line);
  if (level === 'error' || level === 'warn') {
    console.error(output);
  } else {
    console.log(output);
  }
};

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
  // Convenience for controllers that already had `console.error('X', error)`.
  errorWith: (msg: string, error: unknown) =>
    write('error', msg, { error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error }),
};
