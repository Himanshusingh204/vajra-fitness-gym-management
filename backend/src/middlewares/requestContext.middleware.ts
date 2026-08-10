import { randomBytes } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { requestContext, logger } from '../utils/logger';

// Assigns a correlation id to every request, propagates it through
// AsyncLocalStorage so any log call inside the request carries it, echoes it
// back to the caller via X-Request-Id, and records a structured request log on
// completion (method, path, status, duration).

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomBytes(8).toString('hex');

  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();
  const store = { requestId };

  res.on('finish', () => {
    const ms = Date.now() - start;
    const isVerbose = process.env.NODE_ENV !== 'production' || res.statusCode >= 400;
    if (isVerbose && process.env.NODE_ENV !== 'test') {
      logger.info('request completed', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: ms,
      });
    }
  });

  requestContext.run(store, () => next());
};
