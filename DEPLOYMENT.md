# Deploy VajraFitness Online — Free

> **New to deploying?** Follow the click-by-click, step-by-step walkthrough in
> [`FREE_DEPLOYMENT.md`](./FREE_DEPLOYMENT.md) — it covers accounts, screens, and
> exact fields for every step. This file is the concise reference.

This guide deploys the full stack **for free** using:

| Layer    | Service  | Cost   | What it hosts                                  |
| -------- | -------- | ------ | ---------------------------------------------- |
| Database | Neon     | Free   | PostgreSQL (always-on, 0.5 GB storage)         |
| Backend  | Render   | Free   | Node.js/Express API (`vajra-fitness-api`)      |
| Frontend | Netlify  | Free   | React SPA (static `dist/`)                     |

> **Note:** Render's free web services spin down after ~15 minutes of inactivity and
> wake up on the next request (takes a few seconds). Fine for a demo.

> **Alternatives:** the frontend also works on **Vercel** (`vercel.json` ships with
> SPA rewrites) and **Cloudflare Pages** (with a `/* → /index.html` redirect or the
> included `_redirects`). The backend can run on Railway, Fly.io, or Cloud Run using
> the same env vars below.

---

## 1. Database — Neon (free PostgreSQL)

1. Sign up at <https://neon.tech> (GitHub login works, no credit card).
2. Create a new project: name it `vajra-fitness`, pick a region close to you.
3. In the project dashboard, open **Connection Details** and copy the **connection string**.
   - **Use the non-pooled / direct connection string** (it looks like
     `postgresql://user:password@ep-xxxx-xxxx.region.aws.neon.tech/vajra_fitness?sslmode=require`).
   - It may show a "Direct" and a "Pooled" variant — pick **Direct**.
4. Keep this string; you'll paste it into Render next.

---

## 2. Backend — Render (free web service)

The repo ships a Render blueprint at `backend/render.yaml`, so the service can be
created with two clicks.

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Go to <https://render.com> → sign up → **New** → **Blueprint**.
3. Select the repository. Render reads `backend/render.yaml` and creates the
   `vajra-fitness-api` web service.
4. Before the first build finishes, open **Dashboard → your service → Environment** and add:
   - `DATABASE_URL` → the Neon connection string from step 1.
   - `JWT_SECRET` → at least 32 chars. Generate:
     ```
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```
   - `FRONTEND_URL` → your Netlify URL (from step 3), e.g. `https://my-vajra-fitness.netlify.app`.
   - `CORS_ORIGINS` → same Netlify URL (backup to `FRONTEND_URL`).
   - `ALLOW_PRODUCTION_SEED` → `1` (already the default in `render.yaml`). The seed
     scripts refuse to run in production unless this is explicitly `1`; it enables
     the idempotent boot-time seeding of the Super Admin + 3 demo gyms. Remove it
     after you've changed the seeded passwords.
   - **SMTP (recommended):** so activation/password-reset emails are delivered.
      Free options: Brevo (Sendinblue), Gmail App Password, or Mailtrap for testing.
      Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
      If skipped, emails are skipped with a warning in the logs (activation links
      won't reach users).
   - **Razorpay (optional):** enables members to pay pending fees online.
      - `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` — from the Razorpay Dashboard
        (Test mode while validating, then switch to Live keys).
      - `RAZORPAY_WEBHOOK_SECRET` — a random string you also paste into
        Dashboard → Settings → Webhooks → **Add webhook**, URL
        `https://vajra-fitness-api.onrender.com/api/payments/webhook`, event
        **`payment.captured`**. The webhook settles a payment even if the member
        closes the checkout tab mid-payment.
      - Leave these blank to keep online payments disabled; the member UI then
        shows a "configure payments" note and gym admins record offline payments.
5. Click **Manual Deploy → Deploy latest commit**.

On boot, Render runs:
```
npm run db:migrate  # applies committed Prisma migrations
npm run seed        # seeds the Super Admin + 3 demo gyms (idempotent;
                    # requires ALLOW_PRODUCTION_SEED=1, which render.yaml sets)
npm run start       # starts the API on port 5000
```

6. When it's live you'll get a URL like `https://vajra-fitness-api.onrender.com`.
   Verify: open `https://vajra-fitness-api.onrender.com/api/health` → `{"status":"OK"}`.
   Also check `.../api/gym` returns the seeded gyms.

> **Deploying changes:** push to GitHub and hit **Manual Deploy → Deploy latest commit**
> again. Because migrations + seeds are idempotent, re-runs are safe.

---

## 3. Frontend — Netlify (free static hosting)

1. Push the repo to GitHub.
2. Go to <https://app.netlify.com> → **Add new site → Import an existing project**.
3. Pick the repo. Netlify auto-detects the frontend settings from `netlify.toml`
   (`build command: npm run build`, `publish: dist`, SPA redirects).
4. In **Site settings → Environment variables**, add:
   - `VITE_API_URL` → `https://vajra-fitness-api.onrender.com/api`
   - *(optional)* `VITE_WEB_VITALS_ENDPOINT` → your analytics endpoint that
     accepts JSON POSTs of Core Web Vitals (`reportWebVitals.ts`).
   - *(optional)* `VITE_PLAUSIBLE_DOMAIN` → your domain to enable privacy-friendly
     Plausible analytics (also uncomment the script in `frontend/index.html`).
5. Trigger **Deploy site** (or push a commit). The SPA is built with `VITE_API_URL`
   baked in and uploaded to `https://<your-site>.netlify.app`.

> The repo is a monorepo (`frontend/` + `backend/`). Netlify's auto-detection may ask
> for a **base directory** — set it to `frontend` if prompted.

---

## 4. Verify the deployment

| What                        | URL                                                                 |
| --------------------------- | ------------------------------------------------------------------- |
| Frontend                    | `https://<your-site>.netlify.app`                                   |
| API health check            | `https://vajra-fitness-api.onrender.com/api/health`                 |
| Public gym list (JSON)      | `https://vajra-fitness-api.onrender.com/api/gym`                    |
| Super Admin login           | `admin@vajrafitness.com` / `admin123`                               |
| Demo gym admin login        | `owner@ironvalley.com` / `gym123` (or the other two demo owners)    |

**Change the seeded passwords immediately after your first login** — they're for demo only.
In the Super Admin dashboard you can suspend/reset user accounts; gym admins can change
their own password in the app.

---

## Production hardening checklist

- [ ] Use a real domain + free TLS: Netlify/Vercel/Cloudflare Pages all terminate HTTPS
      automatically (HSTS is served by the backend via Helmet for API responses).
- [ ] `JWT_SECRET` ≥ 32 random chars (never the repo default).
- [ ] `TRUST_PROXY=1` on Render/Railway/Cloud Run so rate limiting keys on real IPs.
- [ ] Real SMTP credentials so activation/reset emails are delivered.
- [ ] Replace the seeded demo credentials (`admin@vajrafitness.com` / `admin123`,
      demo gym owners) after your first login.
- [ ] `npm audit` before each release (repo currently: 0 vulnerabilities).
- [ ] Enable Neon automatic backups; test a restore.
- [x] Schema changes ship as committed Prisma migrations under `backend/prisma/migrations/`
      and are applied at boot via `prisma migrate deploy` (see `db:migrate`, `render.yaml`,
      `Dockerfile`). For an existing DB that was previously `db push`-ed, run
      `prisma migrate resolve --applied 20260806000000_init` once against the baseline
      migration so `deploy` only applies future migrations.
- [x] Automated tests run in CI (`npm test` on the backend with a Postgres service):
      auth, authorization/IDOR, membership lifecycle, entitlements, notices.
- [ ] For multi-instance scaling, point the brute-force/rate-limit state at Redis
      (currently in-memory, single-instance).

## Email (activation & password reset) — free options
Member/staff accounts are created with a one-time activation link. Without SMTP the
link is never emailed. Free SMTP providers that work with nodemailer:

- **Brevo** (Sendinblue) — 300 emails/day free. Create an SMTP sender key.
- **Gmail** — enable 2-Step Verification → create an *App Password*.
- **Mailtrap** — great for testing; emails don't actually deliver.

If you skip SMTP entirely, activation links are printed to the Render logs only, so
you can still test the flow by copying the link from *Render → Logs*.

---

## Useful commands (local)

```bash
# Backend (needs Postgres running — `docker compose up -d db`)
cd backend
npm install
npm run db:push        # or `npm run db:migrate` to use committed migrations
npm run seed
npm run dev

# Run the automated test suite (uses the `vajra_fitness_test` DB; override with TEST_DATABASE_URL)
npm test

# Run background jobs once (expiry sync + reminders) manually
npm run jobs

# Frontend
cd frontend
npm install
npm run dev
```

## CI/CD (`deploy.yml`)

- **Quality gate** runs on every push/PR to `main`/`develop`: backend `tsc`, Prisma
  validation, `npm test` (against a temporary Postgres), frontend oxlint + build.
- **Publish** (main + develop): builds the backend image and pushes it to GHCR as
  `ghcr.io/<repo>/backend:<sha>`.
- **Deploy hooks**: the deploy jobs `curl` a Render deploy-hook URL to redeploy.
  Configure these repository secrets:
  - `RENDER_DEPLOY_HOOK_URL_STAGING` — used on the `develop` branch.
  - `RENDER_DEPLOY_HOOK_URL_PRODUCTION` — used on `main`.
  Without them, the job logs a warning and CI stays green; the image is still pushed.

## Troubleshooting

- **`/api/gym` returns 500** → the backend can't reach the DB. Check `DATABASE_URL`
  is the Neon *direct* string and that `npm run db:push` ran without errors in the
  Render logs.
- **Frontend can't fetch / CORS error** → `FRONTEND_URL` / `CORS_ORIGINS` must equal
  the exact Netlify URL (including `https://`), and `VITE_API_URL` must point at the
  Render URL.
- **Cookie/session not persisting** → `withCredentials` + `TRUST_PROXY=1` are set;
  make sure you're not testing cross-site (`localhost` frontend + remote API) with
  strict browser settings.
- **Free Render service sleeps** → just wait ~10 s after opening the site; it wakes up.
