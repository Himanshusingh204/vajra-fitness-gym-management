# Deployment

## Requirements

- Node.js 18+
- PostgreSQL (production: Neon, Render, AWS RDS, etc.)
- Redis (optional for rate limiting and background jobs)
- SMTP server (production: SendGrid, AWS SES, etc.)

## Environment Variables

See `.env.example` for full reference. Critical production variables:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://... (production DB)
JWT_SECRET=<64-char random hex>
FRONTEND_URL=https://yourfrontend.com
TRUST_PROXY=1 (behind nginx/cloud)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your_api_key>
SMTP_FROM="VajraFitness <no-reply@vajrafitness.in>"
RAZORPAY_KEY_ID=<live_key>
RAZORPAY_KEY_SECRET=<live_secret>
RAZORPAY_WEBHOOK_SECRET=<webhook_secret>
```

## Build

```bash
# Backend
npm run build  # Compiles TypeScript to dist/
node dist/server.js

# Frontend
npm run build  # Outputs dist/ (ready for CDN)
```

## Docker

```bash
docker compose up -d --build
```

Includes PostgreSQL, Redis, backend (multi-stage, non-root, healthcheck), and `prisma migrate deploy` on first boot.

## Health Checks

- `GET /api/health` → `{ status: 'ok', db: true, timestamp: ... }`
- Readiness checks: database connection, subscription middleware load

## Production Checklist

- [ ] HTTPS everywhere (HSTS)
- [ ] Random `JWT_SECRET` (≥32 chars, prefer 64)
- [ ] Real SMTP configured
- [ ] `TRUST_PROXY` set if behind proxy
- [ ] Database backups scheduled (`pg_dump` or managed backups)
- [ ] Replace demo credentials after first deploy
- [ ] Monitor `/api/health` and error logs
- [ ] Configure real Razorpay webhook endpoint (`/api/payments/webhook`)
- [ ] Enable rate limit persistence in Redis for multi-instance scale
