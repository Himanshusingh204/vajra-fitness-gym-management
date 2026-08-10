# VajraFitness - Enterprise Gym Management System

VajraFitness is a premium, production-ready SaaS application designed for gym owners in India. It provides a complete solution for managing multiple gyms, staff, trainers, and members with role-based access control and a modern, high-performance user interface.

## Features

### 1. Gym Management & Operations

- **Membership Plans**: Gym owners can create and assign diverse pricing tiers.
- **Membership Lifecycle**: `createMembership` / `renewMembership` with derived status (ACTIVE, EXPIRED, EXPIRING_SOON, etc.), plus a `syncExpiredMemberships` job that auto-expires overdue memberships.
- **Member Registration**: Gym-goers can register for specific branches, pending Admin approval.
- **Secure Onboarding**: Members and staff set their own password via one-time activation links; no default passwords. Forgot/reset-password flow included.
- **Role-Based Access Control**: Strict JWT middleware routes separating Super Admins, Gym Admins, Trainers, Staff, and Members.
- **Fee Management**: Track member payments, dues, and overdue fees securely, with payment method / transaction ID / notes and PDF receipts.
- **Attendance Tracking**: Comprehensive daily check-ins for members and staff (duplicate check-ins blocked).
- **Workout Slips**: Trainers and Admins can assign custom digital workout plans to members.
- **PT Bookings**: Members book trainer sessions; trainers confirm/cancel/complete; gym admins manage all bookings.
- **Notifications**: In-app notification centre per user (bell, unread badge, mark read / mark all, delete).
- **Enquiry Management**: Track incoming gym leads (walk-in or online).

### 2. SaaS Platform

- **SaaS Plans & Gym Subscriptions**: Super Admins create monthly/yearly VajraFitness plans (member/trainer/staff limits, advanced reports) and assign them to gyms; gym owners see their subscription.
- **Reports**: Revenue report (JSON/CSV) and per-gym stats endpoints for gym admins.

## Demo / Default Credentials

These credentials are for **local development only** and must never be exposed on the public website, UI, or production builds.

| Role                              | Email / Username         | Password            | Source                                                                                                                                                 |
| --------------------------------- | ------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Super Admin                       | `admin@vajrafitness.com` | `admin123`          | `backend/scripts/seedSuperAdmin.ts`                                                                                                                    |
| Gym Admin (Iron Valley Gym)       | `owner@ironvalley.com`   | `gym123`            | `backend/scripts/seedGyms.ts`                                                                                                                          |
| Gym Admin (PowerHouse Fitness)    | `owner@powerhouse.com`   | `gym123`            | `backend/scripts/seedGyms.ts`                                                                                                                          |
| Gym Admin (Peak Performance Club) | `owner@peakclub.com`     | `gym123`            | `backend/scripts/seedGyms.ts`                                                                                                                          |
| Member                            | (any created member)     | _(activation link)_ | Gym admins generate a one-time activation link per member; the member sets their own password at `POST /auth/activate`. No default passwords are used. |
| Demo member / trainer / staff     | `first.lastN@demo.in`    | `Demo@1234`         | `backend/scripts/seedDemoData.ts`                                                                                                                      |

- The Super Admin is created by running `npx tsx scripts/seedSuperAdmin.ts` inside `backend/`.
- Approved demo gyms (with membership plans) are seeded by running `npx tsx scripts/seedGyms.ts` inside `backend/`.
- `npm run seed` runs all three seeders in order (idempotent).
- **Realistic demo data**: `backend/scripts/seedDemoData.ts` populates every demo gym with 25–40 members, 5 trainers, 4 staff, membership history, fees (paid/pending/overdue), ~30 days of attendance per active member, PT bookings, workout slips, notifications, and walk-in enquiries — so dashboards and charts look fully operational immediately. It also seeds SaaS plans/subscriptions and CMS FAQs/testimonials.
- Demo member/trainer/staff accounts **only** share the seed password `Demo@1234` so evaluators can log in and explore. Accounts created through the UI instead receive an `activationLink` (built from `FRONTEND_URL`) and have **no default password**.
- In production, replace these defaults with randomly generated secrets and reset all seeded passwords.

## Tech Stack

### Frontend

- React 19 (TypeScript)
- Vite
- React Router v8
- Zustand (State Management)
- TanStack Query (Data Fetching & Caching)
- Tailwind CSS v4 (Custom Premium Theme)
- React Hook Form + Zod (Validation)
- Axios

### Backend

- Node.js & Express 5 (TypeScript)
- Prisma (ORM, PostgreSQL)
- JWT (Authentication) + HTTP-only refresh-token cookie
- argon2 + bcrypt (Password Hashing)
- Helmet & CORS (Security)
- pdfkit (Fee receipts & workout slips as PDF)

## Folder Structure

```
VajraFitness/
├── frontend/          # React SPA
│   ├── src/
│   │   ├── components/  # Reusable UI elements
│   │   ├── hooks/       # Custom React hooks
│   │   ├── layouts/     # Dashboard and public layouts
│   │   ├── pages/       # Route components
│   │   ├── services/    # API and external integrations
│   │   ├── store/       # Zustand state management
│   │   ├── types/       # TypeScript definitions
│   │   └── utils/       # Helper functions
│   └── package.json
└── backend/           # Node.js API
    ├── src/
    │   ├── controllers/ # Request handlers
    │   ├── middlewares/ # Express middlewares (Auth, Error handling)
    │   ├── routes/      # API routes definitions
    │   ├── services/    # Business logic
    │   ├── prisma/      # Prisma schema and migrations
    │   ├── utils/       # Helpers and constants
    │   └── server.ts    # Application entry point
    └── package.json
```

## Installation & Setup

### Prerequisites

- Node.js (v18+)
- PostgreSQL (or SQLite for local dev if configured)

### Environment Variables

**Backend (`backend/.env`)**

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://vajra_admin:vajra_secure_pass@localhost:5432/vajra_fitness?schema=public"
JWT_SECRET="your_super_secret_jwt_key_of_at_least_32_chars"
FRONTEND_URL="http://localhost:5173"
TRUST_PROXY=0
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="VajraFitness <no-reply@vajrafitness.in>"
# Razorpay — enables members to pay pending fees online. Leave empty to keep
# online payments disabled (the UI shows a "configure payments" note instead).
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
```

- The database is **PostgreSQL** (SQLite is not used). For local development run `docker compose up -d db` (see `docker-compose.yml`) or point `DATABASE_URL` at any Postgres instance.
- **Local PostgreSQL credentials** (used by `docker-compose.yml` and the default `DATABASE_URL`): user `vajra_admin`, password `vajra_secure_pass`, database `vajra_fitness`, port `5432`. To create them on an existing Postgres install:

  ```sql
  CREATE ROLE vajra_admin WITH LOGIN PASSWORD 'vajra_secure_pass' CREATEDB;
  CREATE DATABASE vajra_fitness OWNER vajra_admin;
  ```

  Then create the tables and seed demo data:

  ```bash
  cd backend
  npx prisma db push
  npm run seed   # Super Admin + 3 demo gyms + realistic demo data (idempotent)
  ```

- `JWT_SECRET` is enforced at startup to be at least 32 chars.
- `TRUST_PROXY` should be set to `1` (or the number of proxy hops) when deployed behind nginx / Cloud Run / a load balancer so rate limiting keys on real client IPs.
- SMTP is optional in development (links are logged to the console); **required in production** so activation and password-reset emails are delivered.
- Razorpay keys are optional. Until `RAZORPAY_KEY_ID` **and** `RAZORPAY_KEY_SECRET` are both set, the API returns `ONLINE_PAYMENTS_DISABLED` (503) from checkout and the member UI shows a "contact the front desk" note. Set `RAZORPAY_WEBHOOK_SECRET` and point Razorpay's `payment.captured` webhook at `{API_URL}/api/payments/webhook` to auto-settle payments even if the member closes the tab mid-payment.

**Frontend (`frontend/.env`)**

```env
VITE_API_URL="http://localhost:5000/api"
# Optional: privacy-respecting Web Vitals collection (see "Monitoring" below)
# VITE_WEB_VITALS_ENDPOINT="https://analytics.example.com/collect"
# Optional: Plausible analytics domain (enables the privacy-friendly script)
# VITE_PLAUSIBLE_DOMAIN="your-site.com"
```

> **Security model:** Only `VITE_`-prefixed variables are exposed to the browser.
> All secrets (`JWT_SECRET`, `DATABASE_URL`, `SMTP_PASS`, etc.) stay server-side
> and must never be placed in `frontend/.env`.

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start PostgreSQL (or point `DATABASE_URL` at an existing Postgres):
   ```bash
   docker compose up -d db   # from the repo root
   ```
4. Set up the database schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Run the automated test suite (needs the Postgres from step 3; it uses a
   separate `vajra_fitness_test` database, overridable with `TEST_DATABASE_URL`):
   ```bash
   npm test
   ```
   The suite covers auth (login/refresh rotation/reuse detection/activation/lockout),
   role-based authorization and gym isolation (IDOR), membership lifecycle & expiry,
   SaaS entitlement limits (402s), and notice CRUD scoping.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

Base URL: `http://localhost:5000/api` (set via `VITE_API_URL` / `PORT`).

### Authentication

- `POST /auth/register/vendor` — register a gym owner (creates an unapproved gym).
- `POST /auth/register/member` — register a member (`{ gymId, planId? }`), status PENDING.
- `POST /auth/activate` — set a password from a one-time activation link (`token`, `password`).
- `POST /auth/forgot-password` — email a password-reset link; `POST /auth/reset-password` — reset from the token.
- `POST /auth/login` — returns `{ token, user }`; also sets a `refreshToken` HTTP-only cookie.
- `POST /auth/refresh` — cookie-based; returns a fresh `token`.
- `POST /auth/logout` — clears the refresh cookie and revokes the session.
- `GET /auth/me` — current user profile (gym, plan, status, notifications).
- `PUT /auth/password` — authenticated password change (verifies the current password).

All protected routes expect `Authorization: Bearer <token>`. The access token lives 15 minutes; the refresh cookie 7 days.

### Roles & access

`SUPER_ADMIN` manages the whole platform; `GYM_ADMIN` owns one or more gyms; `TRAINER` and `STAFF` belong to a single gym; `MEMBER` belongs to one gym. Endpoints that take a `:gymId` verify that the gym owner is the caller (Super Admin bypasses). Member self-service routes verify the caller is the member, their gym owner, or a Super Admin.

### Public (no auth)

- `GET /gym` — approved gyms with their active plans.
- `GET /plans` — active membership plans only.
- `POST /enquiries/gym/:gymId` — walk-in/online enquiry (public lead).
- `POST /enquiries/contact` — contact-page form.
- `GET /public/faqs`, `GET /public/testimonials` — CMS content.

### Gym Admin dashboard

- `GET|PUT /gym/my-branch` — the owner's gym profile.
- `GET /gym/:gymId/stats` — members/active/pending, revenue (total + this month), pending fees, check-ins today, trainers/staff/plans/notices.
- `GET /plans/admin/gym/:gymId` · `POST /plans` · `PUT /plans/:id` · `DELETE /plans/:id`
- `GET /members/gym/:gymId` · `POST /members/gym/:gymId` · `GET /members/:id` · `PUT /members/:id` (approve/activate) · `POST /members/:id/activation-link` (regenerate link)
- `GET /fees/gym/:gymId` · `POST /fees/gym/:gymId` (accepts `notes`) · `PUT /fees/:id` (status + optional `notes`) · `GET /fees/member/:memberId`
- `GET /fees/:id/receipt` — fee receipt PDF (member self, owner, or Super Admin).
- `GET /attendance/gym/:gymId` · `POST /attendance/gym/:gymId` (member check-in; validates gym membership).
- `GET /workouts/gym/:gymId` — all slips for a gym.
- `POST /workouts/member/:memberId` — assign a slip (admin or the gym's trainer).
- `GET /workouts/:id/pdf` — workout-slip PDF (authorized: self / trainer / owner / Super Admin).
- `GET|POST /staff/gym/:gymId` · `DELETE /staff/:id` — manage trainers/staff (activation link returned on create).
- `GET /enquiries/gym/:gymId` · `PUT /enquiries/:id` — leads.
- Memberships: `GET /memberships/gym/:gymId` · `POST /memberships/gym/:gymId` (create) · `POST /memberships/gym/:gymId/renew` · `GET /memberships/:id`. Auto-expiry of overdue memberships is handled by the `syncExpiredMemberships` job.
- Bookings: `GET /bookings/gym/:gymId` (manage all) · `PATCH /bookings/:id` (role-aware status update).
- Notifications: `GET /notifications` · `PUT /notifications/read-all` · `PUT /notifications/:id/read` · `DELETE /notifications/:id`.
- Notices (announcements): `GET /notices/gym/:gymId` · `POST /notices/gym/:gymId` (create) · `PUT /notices/:id` · `DELETE /notices/:id` — owner / Super Admin only; members, trainers and staff read their own gym's via `GET /notices/my`.
- Online payments (Razorpay): `GET /payments/config` (public, `{ enabled, keyId }`); `POST /payments/checkout` (member, `{ feeId }` → Razorpay order); `POST /payments/verify` (member, `{ orderId, paymentId, signature }` → settles the fee and linked membership); `POST /payments/webhook` (Razorpay `payment.captured`, raw-body signature check). Settlement is server-side + idempotent — the frontend never marks a fee paid.

### Background jobs (scheduler)

`backend/src/jobs/scheduler.ts` runs hourly (and once at boot):

- **Expiry sync** — marks ACTIVE memberships past their end date as `EXPIRED`.
- **Expiry reminders** — notifies members once per membership when it expires within 7 days (`expiryReminderSentAt` guard, ≤200 per run).
- **Fee reminders** — notifies members once per PENDING/OVERDUE fee due within 3 days (`reminderSentAt` guard, ≤200 per run).

All jobs are idempotent, so they can be run manually (`npm run jobs`) or safely re-run after a crash.

### SaaS limits (entitlements)

A gym with an **ACTIVE** `gymSubscription` is bounded by its plan's `maxMembers` / `maxTrainers` / `maxStaff`. Exceeding a limit returns **402** when adding a member, trainer, or staff member. Gyms without an active subscription (including local/dev) are unrestricted. Enforcement lives in `backend/src/services/entitlements.service.ts`.

### Member self-service

- `GET /members/my-profile` — own profile (gym + plan + status).
- `GET /workouts/member/:memberId` · `GET /fees/member/:memberId` — own slips/payments only (403 for cross-member access).
- `GET /memberships/my` — own memberships; `POST /bookings` — book a trainer; `GET /bookings/my` — own bookings.
- `GET /attendance/my` — own check-in history; `GET /notifications` — own notifications.
- `GET /notices/my` — announcements for the member's gym (also available to trainers/staff).

### Super Admin

- `GET /admin/analytics` · `GET /admin/gyms` · `PUT /admin/gyms/:gymId/approve|suspend`
- `GET /admin/users` · `PUT /admin/users/:id/status` — suspend/activate an account (`isActive`). Suspended users are blocked at login and via refresh.
- `GET|POST|PUT|DELETE /admin/cms/faqs` and `/admin/cms/testimonials`
- `GET /admin/support/tickets` · `PUT /admin/support/tickets/:id`
- `GET /admin/audit-logs`
- SaaS: `GET /saas/plans` · `POST /saas/plans` · `PUT /saas/plans/:id` · `DELETE /saas/plans/:id`
- SaaS subscriptions: `GET /saas/subscriptions` · `POST /saas/subscriptions` (assign plan to gym) · `PATCH /saas/subscriptions/:id` (status); gym owners use `GET /saas/my-subscription`.
- Reports: `GET /reports/gym/:gymId/stats` · `GET /reports/gym/:gymId/revenue?format=csv`.

### Mobile app pairing notes

- Use `POST /auth/login` then store `token`; attach it as `Authorization: Bearer <token>`.
- To keep sessions alive without re-login, hold the `refreshToken` HTTP-only cookie (or copy it from the login response's `Set-Cookie` and send it with `POST /auth/refresh`) and re-issue access tokens.
- All PDFs are streamed as `application/pdf` with `Content-Disposition: attachment` — save the response body to a file for offline use.
- The 401 → refresh → retry flow is already implemented in `frontend/src/services/api.ts`; mirror it on mobile for seamless re-authentication.

## Deployment Guide

> **Want to deploy online for free?** Follow the step-by-step guide in
> [`DEPLOYMENT.md`](./DEPLOYMENT.md) — free PostgreSQL on Neon, free backend on
> Render, free frontend on Netlify, all from a `render.yaml` blueprint.

### Production Build

**Frontend:**

```bash
cd frontend
npm run build
```

The output will be in the `dist/` directory, ready to be served by Nginx, Vercel, or Netlify (or a static CDN). Serve it over HTTPS and point `VITE_API_URL` at your backend origin.

**Backend:**

```bash
cd backend
npm run build
```

The output will be compiled TypeScript in the `dist/` directory. Run it with `node dist/server.js`.

### Docker (recommended)

The repo ships a `docker-compose.yml` with PostgreSQL, Redis, and a hardened multi-stage backend image (non-root user, production-only dependencies, healthcheck, and `prisma migrate deploy` on first boot — committed migrations under `backend/prisma/migrations/`).

```bash
docker compose up -d --build
```

Before going live:

- Replace `JWT_SECRET` in `docker-compose.yml` / your environment with a 64-char random value (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
- Configure `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` so activation and password-reset emails are delivered.
- Set `FRONTEND_URL` to your deployed frontend origin.

### Production Security Checklist

- [ ] HTTPS everywhere (terminate TLS at the proxy/CDN; HSTS via the proxy).
- [ ] Strong random `JWT_SECRET` (≥32 chars) and strong Postgres + Redis passwords (never the docker-compose defaults).
- [ ] `TRUST_PROXY=1` set behind nginx / Cloud Run / a load balancer.
- [ ] Real SMTP credentials configured (activation + password-reset emails).
- [ ] Scheduled database backups (`pg_dump` cron or a managed Postgres with automatic backups).
- [x] Reproducible schema changes via `prisma migrate deploy` (committed migration at `backend/prisma/migrations/`); local dev uses `db:push`/`db:migrate` scripts.
- [x] Automated backend tests (auth, authorization/IDOR, membership lifecycle, entitlements, notices, payments) run in CI (`npm test`).
- [ ] Monitoring/alerting on `/api/health` and error logs; log rotation on the runtime.
- [ ] For multi-instance scale-out, move the login brute-force lockout and rate-limit state to Redis (currently in-memory, single-instance).
- [ ] The access token is already memory-only in the browser (refresh token is an httpOnly cookie); rotate the access token after any XSS concern.
- [ ] Live Razorpay payments are implemented end-to-end (member Pay Online → checkout → signature-verified settle → webhook fallback). Go live by setting `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET`; until then the UI shows a "configure payments" note and admins record offline payments (CASH/UPI/CARD/BANK_TRANSFER/OTHER).

### Auth & Security notes

- Passwords are hashed with **argon2** (legacy bcrypt `$2` hashes are auto-migrated on login).
- **The access token lives only in memory** (never localStorage, so an XSS cannot
  exfiltrate a reusable token). Sessions survive page reloads via the httpOnly
  refresh-token cookie, which `bootstrap()` rotates on app startup.
- **Refresh tokens are stored hashed (SHA-256) in PostgreSQL, rotated on every refresh, and reuse of an old token revokes the entire session family.** Logout and password change revoke outstanding tokens immediately.
- Login brute-force protection: per-IP rate limiting + per-email lockout after 5 failures.
- All API routes use Zod validation; no raw SQL is used (Prisma parameterizes all queries).
- Super Admin routes are fully isolated behind a `SUPER_ADMIN`-only guard; gym-scoped and member-scoped routes verify ownership (no IDOR).
- Security headers are set by Helmet (CSP, HSTS preload, clickjacking/`frame-ancestors 'none'`, referrer policy) plus a restrictive Permissions-Policy. CORS is locked to `FRONTEND_URL` + `CORS_ORIGINS`.
- Sensitive endpoints (login, register, activation, password reset, public forms) are rate limited; the whole `/api` tree has a baseline limiter.
- `npm audit` runs clean on both `frontend/` and `backend/` (0 known vulnerabilities).

### SEO, Analytics & Privacy

- Per-page meta titles, descriptions, canonical URLs, and Open Graph/Twitter tags
  are set via `usePageMeta()` (`frontend/src/hooks/usePageMeta.ts`).
- `public/og-image.png` (1200×630), `apple-touch-icon.png` (180×180),
  `manifest.webmanifest`, `sitemap.xml`, `robots.txt`, and `llms.txt` ship with the build.
- Core Web Vitals (LCP, CLS, INP, FCP, TTFB) are collected without dependencies via
  `frontend/src/utils/reportWebVitals.ts`. Set `VITE_WEB_VITALS_ENDPOINT` to enable.
- A one-time cookie-consent notice (`CookieConsent`) and a full Cookie Policy page
  (`/cookies`) explain that only essential cookies (httpOnly sign-in + theme) are used.
- To enable Plausible analytics, set `VITE_PLAUSIBLE_DOMAIN` and uncomment the script
  tag in `frontend/index.html` (kept opt-in so no tracking cookie is set by default).

## License

This project is licensed under the MIT License.
