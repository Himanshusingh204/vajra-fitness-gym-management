import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

// Minimal Prometheus instrumentation, dependency-free of app logic.
// Exposes default process metrics + request rate/latency + custom app counters.
// Mount the /metrics route (see app.ts) and scrape with Prometheus/Grafana.

export const registry = new Registry();

const httpRequests = new Counter({
  name: 'vajra_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: 'vajra_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const dbConnections = new Gauge({
  name: 'vajra_db_connections',
  help: 'Current active database connections',
  registers: [registry],
});

export const backgroundJobsRun = new Counter({
  name: 'vajra_background_jobs_total',
  help: 'Background job executions by job name',
  labelNames: ['job'],
  registers: [registry],
});

export const backgroundJobsErrors = new Counter({
  name: 'vajra_background_jobs_errors_total',
  help: 'Background job failures by job name',
  labelNames: ['job'],
  registers: [registry],
});

// Resolve a stable route label for metrics (path params are normalized).
const routeLabel = (req: Request) => {
  const base = req.baseUrl ? `${req.baseUrl}` : '';
  const path = req.route?.path ?? req.path;
  const full = `${base}${path}`.replace(/\/\d+[^/]*/g, '/:id').replace(/\d+/g, ':id');
  return full || req.path;
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const route = routeLabel(req);
    httpRequests.inc({ method: req.method, route, status: res.statusCode });
    httpDuration.observe({ method: req.method, route, status: res.statusCode }, ms / 1000);
  });
  next();
};

export const metricsHandler = async (_req: Request, res: Response) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
};
