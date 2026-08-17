# Deploying VajraFitness

This app deploys as **one Vercel project** — frontend and backend together,
one dashboard, one URL. The root [`vercel.json`](./vercel.json) configures this:

```json
{
  "version": 2,
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api", "destination": "/api/index.ts" },
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Requests to `/api` and `/api/*` go to the Express serverless function (`api/index.ts`); everything else serves the frontend (Vite SPA). You still need a database, since Vercel doesn't host Postgres — the free option below is Neon.

---

## 1. Database — Neon (free PostgreSQL)

1. Sign up at <https://neon.tech> (GitHub login, no credit card).
2. Create a project named `vajra-fitness`, pick a region close to you.
3. Open **Connect** → copy the **Direct** (non-pooled) connection string:
   ```
   postgresql://user:password@ep-xxxx.region.aws.neon.tech/vajra_fitness?sslmode=require
   ```
4. Keep it — you'll paste it into Vercel's environment variables next.

---

## 2. Deploy — Vercel

1. Push this repo to GitHub (see [CONTRIBUTING.md](./CONTRIBUTING.md) if you haven't set up git yet).
2. Go to <https://vercel.com> → **Add New → Project** → import the repo.
   Vercel reads the root `vercel.json` and creates both the `frontend` and
   `backend` services automatically — you don't need to configure a root
   directory or build command manually.
3. Before the first deploy finishes, open **Project → Settings → Environment
   Variables** and add (Production scope):

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon **pooled** connection string (not "Direct") — Vercel runs the backend as multiple serverless instances, and pooling avoids exhausting Postgres's connection limit under load |
   | `JWT_SECRET` | random ≥32 chars — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | `https://vajra-fitness-gym-management.vercel.app` |
   | `CORS_ORIGINS` | `https://vajra-fitness-gym-management.vercel.app` |
   | `VITE_API_URL` | *(leave unset for this one-project Vercel deployment)* — the frontend uses `/api` on the same domain. Set it only when deliberately hosting the API on a separate origin. |
   | `TRUST_PROXY` | `1` |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | *(recommended)* so activation/reset emails send — see [Email](#email-activation--password-reset) below |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | *(optional)* enables online fee payments; leave blank to keep payments offline-only |

4. Redeploy (**Deployments → ⋯ → Redeploy**) so the env vars take effect.
5. Apply the database schema once, from your machine, using the **direct**
   (non-pooled) Neon string — schema migrations don't go through the pooler:
   ```bash
   cd backend
   DATABASE_URL="<neon direct string>" npm run db:migrate
   DATABASE_URL="<neon direct string>" npm run seed   # optional: Super Admin + demo gyms
   ```

---

## 3. Verify

| What | URL |
| --- | --- |
| Site | `https://<your-project>.vercel.app` |
| API health | `https://<your-project>.vercel.app/api/health` |
| Public gym list | `https://<your-project>.vercel.app/api/gym` |
| Super Admin login | `admin@vajrafitness.com` / `admin123` (only if you ran the seed) |
| Demo gym admin | `owner@ironvalley.com` / `gym123` |

**Change the seeded passwords immediately after your first login** — they're for demo only.

---

## Before Going Live — Placeholder Content to Replace

**Updated 2026-08-17**: phone/WhatsApp/address were set to real-for-now
values across `MainLayout.tsx`, `ContactPage.tsx`, `HelpCenterPage.tsx`
(`+91 78945 61230`, same number for WhatsApp, "Jodhpur, Rajasthan"). SaaS
plan pricing was also set live in the database (Starter ₹2,000/mo,
Professional ₹7,000/mo, Enterprise ₹12,000/mo — set via the Super Admin
SaaS & Subscriptions panel / API, not hardcoded in source).

**Still worth a final pass before real marketing traffic**: confirm the
phone number above is the one you actually want live (it was provided as
a placeholder-replacement, not necessarily final), add a real street
address if you want one beyond "Jodhpur, Rajasthan", and double check the
quarterly/half-yearly/yearly SaaS prices (currently ₹0 — only monthly was
set) if you plan to offer those billing cycles.

### Also worth double-checking before launch

- **Social links** in `frontend/src/layouts/MainLayout.tsx` (lines 47–49) — Instagram/Facebook/YouTube handles.
- **Careers mailbox**: `frontend/src/pages/AboutPage.tsx` line 253 (`mailto:careers@vajrafitness.in`) — confirm it's monitored.

---

## Backups

Neon's own automatic backups are a dashboard toggle, not something this repo
controls — and the **free tier only retains ~1 day of point-in-time
restore**, which isn't enough for a paying gym's member/payment data. This
repo also ships a real, portable backup path that doesn't depend on your
Neon plan:

- `backend/scripts/backup.sh` — runs `pg_dump` against `DATABASE_URL` (use
  the Neon **direct** string) and writes a timestamped, gzip-compressed
  `.sql.gz` file to `backend/backups/` (git-ignored). Run it locally any
  time with `cd backend && npm run backup`. Set `AWS_S3_BACKUP_BUCKET` (plus
  `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION`) to also push the
  dump to S3-compatible storage (AWS S3, Cloudflare R2, Backblaze B2 all
  work via the AWS CLI).
- `.github/workflows/backup.yml` — runs the same script on a daily schedule
  (02:00 UTC). To turn it on:
  1. Repo Settings → Secrets and variables → Actions → **Secrets**: add
     `PROD_DATABASE_URL` (Neon direct string) and, if using S3 upload,
     `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.
  2. Same page → **Variables**: add `BACKUPS_ENABLED = true` (the workflow
     no-ops until this is set, so it doesn't fail nightly on forks/clones
     that haven't configured it) and, if using S3, `AWS_S3_BACKUP_BUCKET` /
     `AWS_REGION`.

  ⚠️ **If this repository is public** (as it is at the time of writing),
  **do not skip this step**: also add secret `BACKUP_ENCRYPTION_KEY` (any
  long random string). GitHub Actions workflow artifacts on a public repo
  are downloadable by *any* GitHub user, not just collaborators — a raw
  production dump (member PII, payment records) must never be uploaded
  unencrypted. Without `BACKUP_ENCRYPTION_KEY` set, the workflow simply
  skips the artifact-upload step entirely rather than uploading it in the
  clear; the S3 path (if configured) is unaffected either way, since a
  private S3 bucket doesn't have this exposure. With the key set, the
  workflow uploads a GPG-encrypted `.sql.gz.gpg` artifact — decrypt it with:
  `gpg --batch --yes --decrypt --passphrase "$BACKUP_ENCRYPTION_KEY" backup.sql.gz.gpg > backup.sql.gz`.
  If this repo is private, or you're running `npm run backup` locally
  (which never touches GitHub Actions artifacts), this doesn't apply.
- **Test a restore before you need one**: `gunzip -c backup.sql.gz | psql "$DATABASE_URL"`
  against a scratch database, and confirm row counts match. A backup nobody
  has ever restored from is not a verified backup.

## Scaling to real traffic

The app is stateless at the request layer — JWTs for access, hashed refresh
tokens in Postgres for sessions — so it scales horizontally without code
changes. As traffic grows past what a single instance handles:

- **Database**: use the Neon **pooled** connection string for `DATABASE_URL`
  (already the default above). If you outgrow Neon's free tier, upgrading
  compute size or moving to a dedicated Postgres instance requires no app
  changes — just swap the connection string.
- **Rate limiting / login lockout**: set `REDIS_URL` (Upstash has a free
  tier that works well with Vercel) to move brute-force lockout and rate
  limiting from in-memory to Redis — required once you run more than one
  backend instance, otherwise limits can be bypassed by hitting different
  instances.
- **Background jobs**: `backend/src/jobs/scheduler.ts` (expiry sync, fee/expiry
  reminders) runs hourly per instance. At scale, run it as a single separate
  worker (e.g. a Vercel Cron Job hitting an internal endpoint) instead of
  inside every serverless instance, to avoid duplicate reminder notifications.
- **Static assets**: the frontend build is served from Vercel's CDN/edge
  network automatically — no extra configuration needed.
- **Monitoring**: watch `/api/health` and set up alerting (Vercel integrates
  with most APM/monitoring providers) before you need it, not after.

## Production hardening checklist

- [ ] Custom domain on Vercel (free TLS, automatic HTTPS).
- [ ] `JWT_SECRET` ≥ 32 random chars (never a repo default).
- [ ] `TRUST_PROXY=1` so rate limiting keys on real client IPs.
- [ ] Real SMTP credentials so activation/reset emails deliver.
- [ ] Replace seeded demo credentials after first login.
- [ ] `npm audit` before each release.
- [ ] Enable Neon automatic backups (or a higher-retention plan) **and** turn on `.github/workflows/backup.yml` (see "Backups" above) so recovery doesn't depend solely on Neon's free-tier 1-day retention; test a restore.
- [x] Schema changes ship as committed Prisma migrations under `backend/prisma/migrations/`, applied via `npm run db:migrate` (`prisma migrate deploy`).
- [x] Automated tests run in CI (`.github/workflows/deploy.yml`): auth, authorization/IDOR, membership lifecycle, entitlements, notices.
- [ ] For multi-instance scaling, set `REDIS_URL` and move background jobs to a single worker (see "Scaling to real traffic" above).

## Email (activation & password reset)

Member/staff accounts get a one-time activation link; without SMTP it's never
emailed (check server logs for the link instead, useful for testing). Free
SMTP providers that work with nodemailer:

- **Brevo** (Sendinblue) — 300 emails/day free.
- **Gmail** — enable 2-Step Verification → create an App Password.
- **Mailtrap** — testing only, doesn't actually deliver.

---

## Local development

```bash
# Backend (needs a local Postgres — see backend/.env.example)
cd backend
npm install
npm run db:push        # or `npm run db:migrate` for committed migrations
npm run seed
npm run dev

npm test                # run the automated test suite

# Frontend
cd frontend
npm install
npm run dev
```

## CI (`.github/workflows/deploy.yml`)

Runs on every push/PR to `main`/`develop`: backend `tsc --noEmit`, Prisma
validation, `npm test` (against a temporary Postgres service), frontend lint
+ build. This is a quality gate only — actual deployment happens via
Vercel's own GitHub integration once the project is imported (step 2 above).

## Troubleshooting

- **`/api/health` or `/api/gym` returns 500** → check `DATABASE_URL` is the
  Neon *direct* string, and that `npm run db:migrate` was run against it.
- **Frontend can't fetch / CORS error** → `FRONTEND_URL` / `CORS_ORIGINS` /
  `VITE_API_URL` must all point at the same Vercel domain.
- **Cookie/session not persisting** → confirm `TRUST_PROXY=1` is set.
- **No Super Admin at login** → the seed step wasn't run against the
  production `DATABASE_URL`; run `npm run seed` per step 2.5 above.

