# VajraFitness — Detailed Overview

VajraFitness is a multi-tenant SaaS gym management system: gym owners run
multiple branches, staff, trainers, and members with role-based access
control on top of a shared platform.

## Features

### 1. Gym Management & Operations

- **Membership Plans**: gym owners create and assign pricing tiers.
- **Membership Lifecycle**: `createMembership` / `renewMembership` with derived status (ACTIVE, EXPIRED, EXPIRING_SOON, etc.), plus a `syncExpiredMemberships` job that auto-expires overdue memberships.
- **Member Registration**: gym-goers register for specific branches, pending admin approval.
- **Secure Onboarding**: members and staff set their own password via one-time activation links; no default passwords. Forgot/reset-password flow included.
- **Role-Based Access Control**: JWT middleware routes separating Super Admins, Gym Admins, Trainers, Staff, and Members.
- **Fee Management**: track member payments, dues, and overdue fees, with payment method / transaction ID / notes and PDF receipts.
- **Attendance Tracking**: daily check-ins for members and staff (duplicate check-ins blocked).
- **Workout Slips**: trainers and admins assign custom digital workout plans to members.
- **PT Bookings**: members book trainer sessions; trainers confirm/cancel/complete; gym admins manage all bookings.
- **Notifications**: in-app notification centre per user (bell, unread badge, mark read/mark all, delete).
- **Enquiry Management**: track incoming gym leads (walk-in or online).

### 2. SaaS Platform

- **SaaS Plans & Gym Subscriptions**: Super Admins create monthly/yearly plans (member/trainer/staff limits, advanced reports) and assign them to gyms; gym owners see their subscription.
- **Reports**: revenue report (JSON/CSV), churn/retention/cohort analytics, and per-gym stats endpoints for gym admins.

## Demo / Default Credentials

**The exact seed credentials are intentionally not documented here or anywhere else in this repository.** This is a public repo, and printing working login credentials in version-controlled docs means anyone can read them — including against any live database that was ever seeded with these scripts, not just a local one.

| Role                              | Source                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Super Admin                       | `backend/scripts/seedSuperAdmin.ts`                                                                                                                    |
| Gym Admin (3 demo gyms)           | `backend/scripts/seedGyms.ts`                                                                                                                          |
| Member                            | Gym admins generate a one-time activation link per member; the member sets their own password at `POST /auth/activate`. No default passwords are used. |
| Demo member / trainer / staff     | `backend/scripts/seedDemoData.ts`                                                                                                                      |

- The Super Admin is created by running `npx tsx scripts/seedSuperAdmin.ts` inside `backend/`. Read that file to see (and, ideally, change) the seeded password before running it against anything but a disposable local database.
- Approved demo gyms (with membership plans) are seeded by running `npx tsx scripts/seedGyms.ts` inside `backend/`.
- `npm run seed` runs all three seeders in order (idempotent).
- **Realistic demo data**: `backend/scripts/seedDemoData.ts` populates every demo gym with a small handful of members/trainers/staff, membership history, fees (paid/pending/overdue), ~30 days of attendance per active member, PT bookings, workout slips, notifications, and walk-in enquiries — so dashboards and charts look operational without inflating a public demo with hundreds of fake accounts. It also seeds SaaS plans/subscriptions and CMS FAQs. Testimonials are intentionally **not** seeded — fabricated customer quotes shown publicly as if real is misleading, not just placeholder filler; add real ones through the admin panel once you have them.
- Demo member/trainer/staff accounts share a single seed password defined in `seedDemoData.ts` so evaluators can log in and explore. Accounts created through the UI instead receive an `activationLink` (built from `FRONTEND_URL`) and have **no default password**.
- **If any of these seed scripts have ever been run against a real/shared database, rotate every seeded password immediately** — the previous version of this documentation published the exact values in plaintext, in this repository's git history, which is public.

## Tech Stack

### Frontend

- React 19 (TypeScript)
- Vite
- React Router v8
- Zustand (state management)
- TanStack Query (data fetching & caching)
- Tailwind CSS v4 (custom design tokens)
- React Hook Form + Zod (validation)
- Axios

### Backend

- Node.js & Express 5 (TypeScript)
- Prisma (ORM, PostgreSQL)
- JWT (authentication) + HTTP-only refresh-token cookie
- argon2 + bcrypt (password hashing, legacy hashes auto-migrated)
- Helmet & CORS (security headers)
- pdfkit (fee receipts & workout slips as PDF)
- ioredis (optional, for distributed rate limiting at scale)

## Folder Structure

```
VajraFitness/
├── frontend/                 # React SPA
│   └── src/
│       ├── components/       # Reusable UI elements
│       ├── hooks/            # Custom React hooks
│       ├── layouts/          # Dashboard and public layouts
│       ├── pages/            # Route components
│       ├── services/         # API and external integrations
│       ├── store/            # Zustand state management
│       ├── types/            # TypeScript definitions
│       └── utils/            # Helper functions
├── backend/                  # Node.js API
│   └── src/
│       ├── controllers/      # Request handlers
│       ├── middlewares/      # Express middlewares (auth, error handling)
│       ├── routes/           # API route definitions
│       ├── services/         # Business logic
│       ├── prisma/           # Prisma schema and migrations
│       ├── utils/            # Helpers and constants
│       └── server.ts         # Application entry point
└── vercel.json                # Single-project Vercel deploy config
```

## Installation & Setup

### Prerequisites

- Node.js 20+
- PostgreSQL

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

- The database is **PostgreSQL**. For local development, point `DATABASE_URL` at any Postgres instance (local install, or a free Neon project — see `DEPLOYMENT.md`).
- `JWT_SECRET` is enforced at startup to be at least 32 chars.
- `TRUST_PROXY` should be set to `1` (or the number of proxy hops) when deployed behind a load balancer so rate limiting keys on real client IPs.
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

> **Security model:** only `VITE_`-prefixed variables are exposed to the browser.
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
3. Point `DATABASE_URL` at a running Postgres instance.
4. Set up the database schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Run the automated test suite (needs the Postgres from step 3; it uses a separate `vajra_fitness_test` database, overridable with `TEST_DATABASE_URL`):
   ```bash
   npm test
   ```
   The suite covers auth (login/refresh rotation/reuse detection/activation/lockout), role-based authorization and gym isolation (IDOR), membership lifecycle & expiry, SaaS entitlement limits (402s), and notice CRUD scoping.

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
- `GET /public/stats` — live gym/member/trainer/city counts.

### Gym Admin dashboard

- `GET|PUT /gym/my-branch` — the owner's gym profile.
- `GET /gym/:gymId/stats` — members/active/pending, revenue (total + this month), pending fees, check-ins today, trainers/staff/plans/notices.
- `GET /plans/admin/gym/:gymId`, `POST /plans`, `PUT /plans/:id`, `DELETE /plans/:id`
- `GET /members/gym/:gymId`, `POST /members/gym/:gymId`, `GET /members/:id`, `PUT /members/:id` (approve/activate), `POST /members/:id/activation-link` (regenerate link)
- `GET /fees/gym/:gymId`, `POST /fees/gym/:gymId` (accepts `notes`), `PUT /fees/:id` (status + optional `notes`), `GET /fees/member/:memberId`
- `GET /fees/:id/receipt` — fee receipt PDF (member self, owner, or Super Admin).
- `GET /attendance/gym/:gymId`, `POST /attendance/gym/:gymId` (member check-in; validates gym membership).
- `GET /workouts/gym/:gymId` — all slips for a gym.
- `POST /workouts/member/:memberId` — assign a slip (admin or the gym's trainer).
- `GET /workouts/:id/pdf` — workout-slip PDF (authorized: self / trainer / owner / Super Admin).
- `GET|POST /staff/gym/:gymId`, `DELETE /staff/:id` — manage trainers/staff (activation link returned on create).
- `GET /enquiries/gym/:gymId`, `PUT /enquiries/:id` — leads.
- Memberships: `GET /memberships/gym/:gymId`, `POST /memberships/gym/:gymId` (create), `POST /memberships/gym/:gymId/renew`, `GET /memberships/:id`. Auto-expiry of overdue memberships is handled by the `syncExpiredMemberships` job.
- Bookings: `GET /bookings/gym/:gymId` (manage all), `PATCH /bookings/:id` (role-aware status update).
- Notifications: `GET /notifications`, `PUT /notifications/read-all`, `PUT /notifications/:id/read`, `DELETE /notifications/:id`.
- Notices (announcements): `GET /notices/gym/:gymId`, `POST /notices/gym/:gymId` (create), `PUT /notices/:id`, `DELETE /notices/:id` — owner/Super Admin only; members, trainers and staff read their own gym's via `GET /notices/my`.
- Reports: `GET /reports/gym/:gymId/stats`, `GET /reports/gym/:gymId/revenue?format=csv`, `GET /reports/gym/:gymId/trainer-performance`.
- Online payments (Razorpay): `GET /payments/config` (public, `{ enabled, keyId }`); `POST /payments/checkout` (member, `{ feeId }` → Razorpay order); `POST /payments/verify` (member, `{ orderId, paymentId, signature }` → settles the fee and linked membership); `POST /payments/webhook` (Razorpay `payment.captured`, raw-body signature check). Settlement is server-side and idempotent — the frontend never marks a fee paid.

### Background jobs (scheduler)

`backend/src/jobs/scheduler.ts` runs hourly (and once at boot):

- **Expiry sync** — marks ACTIVE memberships past their end date as `EXPIRED`.
- **Expiry reminders** — notifies members once per membership when it expires within 7 days (`expiryReminderSentAt` guard, capped per run).
- **Fee reminders** — notifies members once per PENDING/OVERDUE fee due within 3 days (`reminderSentAt` guard, capped per run).

All jobs are idempotent, so they can be run manually (`npm run jobs`) or safely re-run after a crash.

### SaaS limits (entitlements)

A gym with an **ACTIVE** `gymSubscription` is bounded by its plan's `maxMembers` / `maxTrainers` / `maxStaff`. Exceeding a limit returns **402** when adding a member, trainer, or staff member. Gyms without an active subscription (including local/dev) are unrestricted. Enforcement lives in `backend/src/services/entitlements.service.ts`.

### Member self-service

- `GET /members/my-profile` — own profile (gym + plan + status).
- `GET /workouts/member/:memberId`, `GET /fees/member/:memberId` — own slips/payments only (403 for cross-member access).
- `GET /memberships/my` — own memberships; `POST /bookings` — book a trainer; `GET /bookings/my` — own bookings.
- `GET /attendance/my` — own check-in history; `GET /notifications` — own notifications.
- `GET /notices/my` — announcements for the member's gym (also available to trainers/staff).

### Super Admin

- `GET /admin/analytics`, `GET /admin/gyms`, `PUT /admin/gyms/:gymId/approve|suspend`
- `GET /admin/users`, `PUT /admin/users/:id/status` — suspend/activate an account (`isActive`). Suspended users are blocked at login and via refresh.
- `GET|POST|PUT|DELETE /admin/cms/faqs` and `/admin/cms/testimonials`
- `GET /admin/support/tickets`, `PUT /admin/support/tickets/:id`
- `GET /admin/audit-logs`
- SaaS: `GET /saas/plans`, `POST /saas/plans`, `PUT /saas/plans/:id`, `DELETE /saas/plans/:id`
- SaaS subscriptions: `GET /saas/subscriptions`, `POST /saas/subscriptions` (assign plan to gym), `PATCH /saas/subscriptions/:id` (status); gym owners use `GET /saas/my-subscription`.

### Mobile app pairing notes

- Use `POST /auth/login` then store `token`; attach it as `Authorization: Bearer <token>`.
- To keep sessions alive without re-login, hold the `refreshToken` HTTP-only cookie (or copy it from the login response's `Set-Cookie` and send it with `POST /auth/refresh`) and re-issue access tokens.
- All PDFs are streamed as `application/pdf` with `Content-Disposition: attachment` — save the response body to a file for offline use.
- The 401 → refresh → retry flow is already implemented in `frontend/src/services/api.ts`; mirror it on mobile for re-authentication.

## Deployment

> See [`DEPLOYMENT.md`](../DEPLOYMENT.md) for the step-by-step guide: a single
> Vercel project (`vercel.json`) serves the frontend and backend together on
> one domain, with a free Neon PostgreSQL database.

### Production build (manual/local check)

**Frontend:**

```bash
cd frontend
npm run build
```

Output goes to `dist/`.

**Backend:**

```bash
cd backend
npm run build
```

Output is compiled TypeScript in `dist/`. Run with `node dist/server.js`.

### Scaling beyond a single instance

The app is stateless at the request layer (JWT access tokens, hashed refresh
tokens in Postgres) so it horizontally scales cleanly — the following pieces
need attention as traffic grows:

- **Database connection pooling**: point `DATABASE_URL` at a pooled connection
  string (e.g. Neon's pooler, or PgBouncer) once you run more than a
  handful of concurrent backend instances/serverless functions — Postgres
  has a hard connection limit and unpooled clients exhaust it fast.
- **Rate limiting & login lockout state**: currently in-memory per instance.
  Set `REDIS_URL` to move this to Redis (`ioredis` is already a dependency)
  so limits are enforced correctly across multiple instances.
- **Background jobs**: `backend/src/jobs/scheduler.ts` runs hourly per
  instance. Behind multiple instances, restrict it to a single leader
  (e.g. a dedicated worker/cron deployment) to avoid duplicate reminder
  notifications.
- **CDN & caching**: the frontend is a static build (Vite `dist/`) served
  from Vercel's edge network by default — no extra configuration needed for
  read-heavy public pages.
- **Database indexing**: high-traffic queries (member lookups by gym,
  attendance/fee lists) are indexed in `backend/prisma/schema.prisma`;
  review `EXPLAIN ANALYZE` on slow queries as data volume grows.

### Production Security Checklist

- [ ] HTTPS everywhere (Vercel terminates TLS automatically).
- [ ] Strong random `JWT_SECRET` (≥32 chars) and strong Postgres password (never a default).
- [ ] `TRUST_PROXY=1` set (Vercel runs behind its own proxy).
- [ ] Real SMTP credentials configured (activation + password-reset emails).
- [ ] Scheduled database backups (Neon automatic backups, or `pg_dump` cron for self-hosted Postgres).
- [x] Reproducible schema changes via `prisma migrate deploy` (committed migrations at `backend/prisma/migrations/`); local dev uses `db:push`/`db:migrate` scripts.
- [x] Automated backend tests (auth, authorization/IDOR, membership lifecycle, entitlements, notices, payments) run in CI (`npm test`).
- [ ] Monitoring/alerting on `/api/health` and error logs; log rotation on the runtime.
- [ ] For multi-instance scale-out, move the login brute-force lockout and rate-limit state to Redis (see "Scaling" above).
- [ ] The access token is already memory-only in the browser (refresh token is an httpOnly cookie); rotate the access token after any XSS concern.
- [ ] Live Razorpay payments are implemented end-to-end (member Pay Online → checkout → signature-verified settle → webhook fallback). Go live by setting `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET`; until then the UI shows a "configure payments" note and admins record offline payments (CASH/UPI/CARD/BANK_TRANSFER/OTHER).

### Auth & Security notes

- Passwords are hashed with **argon2** (legacy bcrypt `$2` hashes are auto-migrated on login).
- **The access token lives only in memory** (never localStorage, so an XSS cannot exfiltrate a reusable token). Sessions survive page reloads via the httpOnly refresh-token cookie, which `bootstrap()` rotates on app startup.
- **Refresh tokens are stored hashed (SHA-256) in PostgreSQL, rotated on every refresh, and reuse of an old token revokes the entire session family.** Logout and password change revoke outstanding tokens immediately.
- Login brute-force protection: per-IP rate limiting + per-email lockout after 5 failures.
- All API routes use Zod validation; no raw SQL is used (Prisma parameterizes all queries).
- Super Admin routes are fully isolated behind a `SUPER_ADMIN`-only guard; gym-scoped and member-scoped routes verify ownership (no IDOR).
- Security headers are set by Helmet (CSP, HSTS preload, clickjacking/`frame-ancestors 'none'`, referrer policy) plus a restrictive Permissions-Policy. CORS is locked to `FRONTEND_URL` + `CORS_ORIGINS`.
- Sensitive endpoints (login, register, activation, password reset, public forms) are rate limited; the whole `/api` tree has a baseline limiter.
- `npm audit` runs clean on both `frontend/` and `backend/` (0 known vulnerabilities).

### SEO, Analytics & Privacy

- Per-page meta titles, descriptions, canonical URLs, and Open Graph/Twitter tags are set via `usePageMeta()` (`frontend/src/hooks/usePageMeta.ts`).
- `public/og-image.png` (1200×630), `apple-touch-icon.png` (180×180), `manifest.webmanifest`, `sitemap.xml`, `robots.txt`, and `llms.txt` ship with the build.
- Core Web Vitals (LCP, CLS, INP, FCP, TTFB) are collected without dependencies via `frontend/src/utils/reportWebVitals.ts`. Set `VITE_WEB_VITALS_ENDPOINT` to enable.
- A one-time cookie-consent notice (`CookieConsent`) and a full Cookie Policy page (`/cookies`) explain that only essential cookies (httpOnly sign-in + theme) are used.
- Vercel Analytics and Speed Insights are wired into `frontend/src/App.tsx` (`@vercel/analytics/react`, `@vercel/speed-insights/react`) — cookieless, no personal data collected. Collection itself still needs enabling per-project in the Vercel dashboard (Analytics / Speed Insights tabs).

## License

This project is proprietary — All Rights Reserved. See [`LICENSE`](../LICENSE).
