# Deploy VajraFitness Online for Free — Step by Step

A beginner-friendly, click-by-click guide that puts the full app online **at zero cost**
using three free-tier services:

| Layer    | Service  | Cost | What it hosts                                   |
| -------- | -------- | ---- | ----------------------------------------------- |
| Database | Neon     | $0   | PostgreSQL (always-on, 0.5 GB)                  |
| Backend  | Render   | $0   | Node.js/Express API (free web service)          |
| Frontend | Netlify  | $0   | React SPA (static `dist/`)                      |

> **How long:** ~30–45 minutes, most of it waiting on builds.
> **Prereq:** this repo pushed to a GitHub account (Netlify, Render and Neon can all
> sign in with GitHub).

> **Good to know:** Render's free web services sleep after ~15 minutes without traffic
> and wake on the next request (a few seconds). Fine for a demo or staging.

---

## Step 1 — Push the repo to GitHub

1. Create an empty repository at <https://github.com/new> (name it e.g. `vajra-fitness`, keep it **Private** or **Public** — either works).
2. In this project folder, run:
   ```bash
   git remote add origin https://github.com/<YOUR_USERNAME>/vajra-fitness.git
   git branch -M main
   git push -u origin main
   ```
3. Confirm the files appear on GitHub (you should see `frontend/`, `backend/`, `DEPLOYMENT.md`, etc.).

---

## Step 2 — Database: Neon (free PostgreSQL)

1. Go to <https://neon.tech> → **Sign up** → **Continue with GitHub**. No credit card.
2. Create a project:
   - **Name:** `vajra-fitness`
   - **Region:** closest to you
3. When it's ready, click **Connect** (top right of the dashboard).
4. In the connection modal:
   - Pick **Connection string**
   - Copy the **Direct** (non-pooled) string. It looks like:
     ```
     postgresql://neondb_owner:xxxxx@ep-xxx-xxxx.region.aws.neon.tech/vajra_fitness?sslmode=require
     ```
   - **Do not** use the *Pooled* one for this step.
5. Paste this into a notepad — you'll need it in Step 3.
   > Neon's free plan auto-pauses after 5 minutes idle and wakes on the first query
   > (fine for a demo). Keep the default storage branch settings.

---

## Step 3 — Backend: Render (free web service)

1. Go to <https://render.com> → **Sign up** → **Continue with GitHub**. No credit card.
2. In the dashboard: **New** (top right) → **Blueprint**.
   - This repo ships `backend/render.yaml`, so Render creates the service automatically.
3. Choose the GitHub repo from Step 1 → **Connect**.
4. Render reads `render.yaml` and shows the `vajra-fitness-api` web service → click **Apply**.

### 3a. Add environment variables

While the first deploy builds (takes a few minutes), set the secrets:

1. Open **Dashboard → your service** (vajra-fitness-api) → **Environment** tab.
2. Add each of these and click **Save**:

   | Key                   | Value                                                           |
   | --------------------- | --------------------------------------------------------------- |
   | `DATABASE_URL`        | the Neon **Direct** string from Step 2                          |
   | `JWT_SECRET`          | a random string ≥ 32 chars (see command below)                  |
   | `FRONTEND_URL`        | your Netlify URL from Step 4, e.g. `https://my-vajra-fitness.netlify.app` |
   | `CORS_ORIGINS`        | the same Netlify URL                                            |
   | `ALLOW_PRODUCTION_SEED` | `1` (allows boot-time seeding — `render.yaml` already sets this) |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | *(optional)* free email provider keys so activation/reset emails are delivered |

   Generate `JWT_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. **Razorpay (optional):** set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` (test keys from
   the Razorpay dashboard) to enable online fee payments. Skip to keep them offline.

### 3b. Wait for the build

1. Go to the **Events** or **Deploys** tab — you'll see the build progress.
2. On success, open **Settings** and note the service URL:
   `https://vajra-fitness-api.onrender.com`
3. Verify the API is alive:
   - Open `https://vajra-fitness-api.onrender.com/api/health` → you should see `{"status":"OK"}`.
   - Open `https://vajra-fitness-api.onrender.com/api/gym` → a JSON list of the 3 seeded demo gyms.

> On boot Render runs (from `render.yaml`):
> ```
> npm run db:migrate   # applies committed Prisma migrations
> npm run seed         # seeds Super Admin + 3 demo gyms + demo data (idempotent)
> npm run start        # serves the API on port 5000
> ```
> If `ALLOW_PRODUCTION_SEED` is unset or not `1`, the seed step logs a warning and is
> skipped (so the Super Admin won't exist). Set it to `1`.

---

## Step 4 — Frontend: Netlify (free static hosting)

1. Go to <https://app.netlify.com> → **Sign up** → **Continue with GitHub**. No credit card.
2. **Add new site** → **Import an existing project** → pick the GitHub repo from Step 1.
3. Netlify auto-detects the settings from `frontend/netlify.toml`:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - SPA redirects (`/* → /index.html`) are already configured.
   - If it doesn't auto-detect, enter these values manually.
4. Before the first build, set the build-time env var so the SPA knows where the API is:
   - **Site configuration → Environment variables** (or during import, **Advanced build settings**):
   - Key: `VITE_API_URL` → Value: `https://vajra-fitness-api.onrender.com/api`
5. Click **Deploy site** (or push a commit). Netlify builds and hosts the SPA.
6. After the deploy finishes, note your site URL:
   `https://<random-name>.netlify.app`
   - You can rename it under **Site configuration → Site details → Change site name**,
     e.g. `https://my-vajra-fitness.netlify.app`.
7. If you changed the URL after setting `FRONTEND_URL`/`CORS_ORIGINS` on Render, update
   those two Render env vars to match and redeploy the backend.

---

## Step 5 — Connect everything & verify

### If you changed your Netlify site name

1. Render → vajra-fitness-api → **Environment**.
2. Update `FRONTEND_URL` and `CORS_ORIGINS` to the new Netlify URL.
3. Render → **Manual Deploy** → **Deploy latest commit**.

### Smoke test

| What                 | URL / action                                                        |
| -------------------- | ------------------------------------------------------------------- |
| Homepage             | `https://<your-site>.netlify.app`                                   |
| Public gym list      | `https://<your-site>.netlify.app/gyms`                              |
| API health           | `https://vajra-fitness-api.onrender.com/api/health`                 |
| Super Admin login    | `admin@vajrafitness.com` / `admin123`                               |
| Demo gym admin login | `owner@ironvalley.com` / `gym123` (or the other two demo owners)    |
| Demo member/trainer  | `<first.last>@demo.in` / `Demo@1234` (created by `seedDemoData.ts`) |

**Login flow that exercises the full stack:**
1. Open the frontend → **Login** → Super Admin credentials above → you should land on the Super Admin dashboard.
2. Visit a gym page → the gym data comes from the Render API → Neon DB.

---

## Step 6 — Secure & harden (before real users)

- [ ] **Change all seeded passwords** (`admin123`, `gym123`, `Demo@1234`) right after your first login.
- [ ] On Render, remove `ALLOW_PRODUCTION_SEED` (or set it to `0`) so seeds stop running.
- [ ] Add real SMTP credentials (Brevo / Gmail App Password) so activation + reset emails deliver.
- [ ] Keep `JWT_SECRET` ≥ 32 random chars (never the repo default).
- [ ] Set a custom domain on Netlify for free HTTPS on your own domain.
- [ ] Enable Neon automatic backups / point-in-time recovery (free plan includes PITR).
- [ ] (Multi-instance scale) point rate limiting at Redis by setting `REDIS_URL`.

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full production checklist.

---

## Redeploying after code changes

- **Backend:** push to GitHub → Render **Manual Deploy → Deploy latest commit**.
- **Frontend:** push to GitHub → Netlify auto-deploys `main`.
- Migrations + seeds are idempotent, so re-deploys are safe.

---

## Troubleshooting

| Problem                                   | Fix                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `/api/health` returns 500 or `db: false`  | `DATABASE_URL` is wrong/pooled. Use the Neon **Direct** string.      |
| `/api/gym` returns 500                    | DB unreachable or migrations didn't run — check Render → Logs.       |
| No Super Admin at login                   | Seeds were skipped. Set `ALLOW_PRODUCTION_SEED=1` and redeploy.      |
| Frontend can't fetch (CORS)               | `FRONTEND_URL`/`CORS_ORIGINS` must exactly match the Netlify URL (with `https://`), and `VITE_API_URL` must point at Render, then rebuild the frontend (env vars are baked in at build time). |
| Login works, dashboard empty              | Free Render/Neon services may have slept; reload after ~10 s.        |
| Activation/reset email never arrives      | SMTP not configured — check Render → Logs for the link, or add SMTP. |
