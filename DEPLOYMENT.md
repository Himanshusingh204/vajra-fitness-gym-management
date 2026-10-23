# Deployment

VajraFitness deploys as one Vercel project that serves both the frontend and the API, backed by a Neon PostgreSQL database. Redis (Upstash) and an SMTP provider are optional but recommended.

How the single project is wired:

- `package.json` has `vercel-build`, which generates the Prisma client, compiles the backend and builds the frontend.
- `vercel.json` sets the output directory to `frontend/dist` and rewrites `/api` and `/api/*` to the serverless function in `api/index.ts`, which re-exports the Express app. Every other path serves `index.html`, so client-side routes work on refresh.
- The frontend calls `/api` on its own origin, so no CORS is involved on the web.

## 1. Database (Neon)

1. Create a Neon project and note both connection strings from the Connect dialog: the pooled one and the direct one.
2. Use the **pooled** string as `DATABASE_URL` in Vercel. Serverless functions open many short connections and the pooler keeps Postgres from running out.
3. Use the **direct** string for migrations, `pg_dump` and the backup workflow. They do not work reliably through the pooler.

Keep a separate Neon branch or project for development. Do not use the production database for local work.

## 2. Vercel project

1. Import the GitHub repository into Vercel. The root `vercel.json` and `package.json` are enough; no root directory or build command needs to be set.
2. Production branch: `main`. Other branches, including `staging`, get preview deployments.
3. Add environment variables under Project, Settings, Environment Variables. Names only here; generate values yourself.

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `JWT_SECRET` | At least 32 random characters. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | The public site URL; used in emailed links and for CORS |
| `CORS_ORIGINS` | Extra allowed origins, comma separated |
| `TRUST_PROXY` | `1`, so rate limits key on the real client IP |
| `PUBLIC_SITE_URL` | Base URL used in the sitemap, if different from the default |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Needed for activation and password reset mail |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Optional. Online payments stay disabled until the key pair is set |
| `REDIS_URL` | Recommended. Without it, rate limits, lockout counters and caches are per instance and reset on cold starts |
| `CRON_SECRET` | Required to call `/api/internal/cron`, which runs the background jobs. The endpoint answers 401 without it |
| `METRICS_TOKEN` | Optional. When set, `/metrics` requires `Authorization: Bearer <token>` |
| `VITE_API_URL` | Leave unset for this single-project setup |

Vercel Analytics and Speed Insights are wired into `frontend/src/App.tsx`, but collect nothing until enabled in the Vercel dashboard.

## 3. Migrations

Schema changes are committed as Prisma migrations in `backend/prisma/migrations/` and applied with `prisma migrate deploy`. **Vercel does not run migrations.** Run them yourself, against the direct Neon string:

```bash
cd backend
DATABASE_URL="<neon direct string>" npm run db:migrate
```

Order of operations for any pull request that changes `schema.prisma`:

1. Commit the migration folder with the schema change.
2. Test it on a throwaway database first: `prisma migrate deploy`, then `prisma migrate diff` against `schema.prisma` should report no difference.
3. **Run `prisma migrate deploy` against production before merging to `main`.** The new code is deployed by the merge; if the column or table is not there yet, requests that use it fail.
4. Merge `staging` into `main`.

Keep migrations additive (new nullable columns, new tables, new indexes) so the old code keeps working during the window between the migration and the deploy. Do not drop or rename columns in the same release that stops using them.

Seeding production is not needed. If you want the platform super admin and demo gyms in a new environment, run `npm run seed` with the target `DATABASE_URL`; the seed scripts refuse to run when `NODE_ENV` is `production` unless `ALLOW_PRODUCTION_SEED=1`. Change every seeded password immediately.

## 4. Verify a deployment

| Check | URL |
| --- | --- |
| Site loads | `https://<project>.vercel.app` |
| API and database | `https://<project>.vercel.app/api/health` returns `status: "OK"` and `dependencies.database: "up"`, or 503 if the database is unreachable |
| Readiness | `/api/ready` |
| Public gym list | `/api/gym` |

## Branching and CI/CD

- Work on feature branches cut from `staging` and open pull requests into `staging`.
- When `staging` is verified, merge it into `main`. Vercel deploys `main` to production.
- `.github/workflows/deploy.yml` (job `quality`) runs on pushes to `main`, `staging` and `develop` and on pull requests to `main` and `staging`. It installs the workspaces on Node 22, runs `prisma validate`, `prisma generate`, `tsc --noEmit`, the backend build, the backend tests against a Postgres 16 service container, frontend lint and the frontend build. It does not deploy; Vercel's GitHub integration does.
- `.github/workflows/security.yml` runs CodeQL (pull requests, pushes and weekly), dependency review on pull requests, `npm audit` for production dependencies (report only) and a gitleaks scan.
- `.github/workflows/e2e-audit.yml` builds the app, applies migrations, seeds a throwaway database, starts the API and a Vite preview, then runs the frontend's `test:e2e`, `audit:seo`, `audit:a11y` and `lighthouse` scripts if they are defined.
- Required status check for branch protection: `quality`. Add `e2e-audit` and `codeql` once they pass reliably.
- If CodeQL default setup is turned on in repository settings, turn it off; it conflicts with the workflow.

CI installs with `npm install --legacy-peer-deps` after deleting the nested `backend/package-lock.json` and `frontend/package-lock.json`, because npm's workspace resolution fails with them present. Do the same locally if a clean install fails.

## Background jobs

`backend/src/jobs/scheduler.ts` expires memberships, sends expiry and fee reminders, reconciles payments and handles subscription dunning. All jobs are safe to run repeatedly.

- On a long-running host, `server.ts` runs them at boot and then on an hourly interval.
- On Vercel, functions do not stay alive. Call `GET /api/internal/cron` on a schedule with `Authorization: Bearer <CRON_SECRET>`. `vercel.json` does not currently define a cron entry, so add one (Vercel Cron sends that header when `CRON_SECRET` is set) or call the endpoint from another scheduler.
- `npm run jobs` in `backend` runs them once from the command line.

## Backups

Neon's free plan keeps about a day of point-in-time history, which is not enough for member and payment data. The repository includes its own backup path.

- `backend/scripts/backup.sh` runs `pg_dump` against `DATABASE_URL` (direct string) and writes a timestamped `.sql.gz` to `backend/backups/` (git-ignored). Run it with `cd backend && npm run backup`. Set `AWS_S3_BACKUP_BUCKET` with the usual `AWS_*` credentials to also upload to S3-compatible storage.
- `.github/workflows/backup.yml` runs it daily at 02:00 UTC. It does nothing until you set the repository variable `BACKUPS_ENABLED` to `true` and the secret `PROD_DATABASE_URL`. For S3 upload, add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as secrets and `AWS_S3_BACKUP_BUCKET` and `AWS_REGION` as variables.
- On a public repository, workflow artifacts can be downloaded by any GitHub user. Set the secret `BACKUP_ENCRYPTION_KEY`; the workflow then uploads only a GPG-encrypted `.sql.gz.gpg` artifact and skips the artifact step when the key is missing. Decrypt with `gpg --batch --yes --decrypt --passphrase "$BACKUP_ENCRYPTION_KEY" backup.sql.gz.gpg > backup.sql.gz`.
- Test a restore into a scratch database before you need one: `gunzip -c backup.sql.gz | psql "$DATABASE_URL"`, then compare row counts.

## Production checklist

- [ ] `JWT_SECRET` is a fresh random value, not one from an example file.
- [ ] `TRUST_PROXY=1`.
- [ ] SMTP configured, and an activation email actually arrives.
- [ ] `REDIS_URL` set.
- [ ] `CRON_SECRET` set and a scheduler calling `/api/internal/cron`.
- [ ] Seeded demo passwords changed or the seed never run against production.
- [ ] Razorpay keys and webhook secret set if online payments are wanted. The webhook URL is `/api/payments/webhook`.
- [ ] Backups enabled and one restore tested.
- [ ] Contact details, social links and legal pages in the frontend replaced with real ones. Check `MainLayout`, `ContactPage`, `HelpCenterPage` and the footer.
- [ ] Alerting on `/api/health`.
- [ ] `npm audit` reviewed before a release.

## Troubleshooting

- `/api/health` returns 503 or 500: check that `DATABASE_URL` is set and reachable, and that migrations were applied.
- Requests fail right after a deploy with errors about a missing column or table: the migration was not applied before the merge. Run `npm run db:migrate` against production.
- CORS errors or cookies not sticking: confirm `FRONTEND_URL` and `CORS_ORIGINS` match the site origin and `TRUST_PROXY=1`.
- Rate limits behave oddly across requests: `REDIS_URL` is not set, so each instance keeps its own counters.
- Activation or reset emails never arrive: SMTP variables are missing. Without SMTP, the links are written to the server log.
