# Detailed overview

What the product does, who uses it, and which endpoints serve each area. For setup see the [README](../README.md); for how the pieces fit together see [architecture.md](architecture.md); for the endpoints added most recently (trainer signup, profile, public gym page, mobile token flow) see [api.md](api.md).

All API paths below are relative to `/api`.

## Roles

| Role | Access |
| --- | --- |
| `SUPER_ADMIN` | Platform-wide. Bypasses the subscription gate |
| `GYM_ADMIN` | Gyms they own. Endpoints with a `:gymId` check ownership |
| `TRAINER`, `STAFF` | One gym. Trainers need approval from the gym owner after self-registering |
| `MEMBER` | Their own records. Self-service routes check that the caller is the member, the gym owner or a super admin |

## Onboarding and accounts

- `POST /auth/register/vendor` registers a gym owner and creates an unapproved gym. A trial subscription starts automatically.
- `POST /auth/register/member` registers a member for a gym; the status starts as pending until the gym approves.
- `POST /auth/register/trainer` submits a trainer application for an approved gym. The gym owner approves or rejects it under `/staff/trainer-applications/:id`.
- Members and staff created by a gym admin get a one-time activation link and set their own password with `POST /auth/activate`. There are no default passwords.
- `POST /auth/forgot-password` and `POST /auth/reset-password` handle password reset.
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `GET/PUT /auth/profile`, `PUT /auth/password`.
- Access tokens last 15 minutes, refresh tokens 7 days. See [architecture.md](architecture.md#authentication).

Without SMTP configured, activation and reset links are written to the server log instead of emailed.

## Gym operations

| Area | Endpoints |
| --- | --- |
| Gym profile and stats | `GET/PUT /gym/my-branch`, `GET /gym/:gymId/stats`, `/branches` |
| Membership plans | `GET /plans`, `GET /plans/admin/gym/:gymId`, `POST /plans`, `PUT/DELETE /plans/:id` |
| Members | `GET/POST /members/gym/:gymId`, `POST /members/gym/:gymId/import`, `GET/PUT/DELETE /members/:id`, `POST /members/:id/activation-link`, `GET /members/my-profile`, `POST /members/enroll` |
| Memberships | `GET/POST /memberships/gym/:gymId`, `POST /memberships/gym/:gymId/renew`, `GET /memberships/my`, `GET /memberships/:id` |
| Fees | `GET/POST /fees/gym/:gymId`, `PUT /fees/:id`, `GET /fees/member/:memberId`, `GET /fees/:id/receipt` (PDF) |
| Attendance | `GET/POST /attendance/gym/:gymId`, `GET /attendance/my` |
| Staff and trainers | `GET/POST /staff/gym/:gymId`, `DELETE /staff/:id`, trainer applications |
| Workouts | `GET /workouts/gym/:gymId`, `POST /workouts/member/:memberId`, `GET /workouts/member/:memberId`, `GET /workouts/:id/pdf` |
| Bookings (personal training) | `POST /bookings`, `GET /bookings/my`, `GET /bookings/gym/:gymId`, `PATCH /bookings/:id` |
| Group classes | `GET /classes/gym/:gymId`, `POST /classes/gym/:gymId`, `PUT/DELETE /classes/:id`, `POST /classes/:classId/book` |
| Progress and nutrition | `/progress`, `/nutrition` |
| Enquiries | `POST /enquiries/gym/:gymId` (public), `GET /enquiries/gym/:gymId`, `PUT /enquiries/:id`, `POST /enquiries/contact` |
| Notices | `GET/POST /notices/gym/:gymId`, `PUT/DELETE /notices/:id`, `GET /notices/my` |
| Notifications | `GET /notifications`, `PUT /notifications/read-all`, `PUT /notifications/:id/read`, `DELETE /notifications/:id` |
| Business tools | `/inventory`, `/equipment`, `/expenses`, `/payslips`, `/referrals`, `/support` |
| Reports | `GET /reports/gym/:gymId/stats`, `/analytics`, `/revenue`, `/trainers` |

Memberships have a derived status (active, expiring soon, expired). The scheduler marks overdue memberships as expired and reminds members before expiry and before fees fall due.

## Payments

Fees can be recorded as paid offline (cash, UPI, card, bank transfer, other) or paid online through Razorpay.

- `GET /payments/config` reports whether online payments are enabled.
- `POST /payments/checkout` creates a Razorpay order for a fee.
- `POST /payments/verify` checks the signature and settles the fee and its linked membership.
- `POST /payments/webhook` is the Razorpay webhook (raw body, signature checked).
- `POST /payments/refund` is available to gym admins and super admins.

Until `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set, checkout returns `ONLINE_PAYMENTS_DISABLED` (503) and the member UI tells members to pay at the front desk. Set `RAZORPAY_WEBHOOK_SECRET` and point Razorpay at `/api/payments/webhook` so payments settle even if the member closes the tab.

## SaaS layer

- Super admins manage SaaS plans (`/saas/plans`) and gym subscriptions (`/saas/subscriptions`). Gym owners buy or check out a plan through `/saas/purchase` and `/saas/checkout`, and read their own with `/saas/my-subscription`.
- A plan limits members, trainers and staff per gym (`maxMembers`, `maxTrainers`, `maxStaff`). Going over a limit returns `402`. Enforcement is in `backend/src/services/entitlements.service.ts`.
- Subscription states: `PENDING`, `TRIAL`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, `EXPIRED`, `SUSPENDED`, `CANCELLED`. After the end date a subscription moves into a grace period (3 days by default) and then `EXPIRED`. Expired, suspended or plan-less gyms are read-only: reads work, writes return an error until the subscription is renewed.
- Super admin tools under `/admin`: analytics, gym approval and suspension, user status, CMS content (FAQs, testimonials), support tickets and the audit log.

## Public content

`GET /gym` (approved gyms with plans), `GET /public/gyms/:gymId`, `GET /public/faqs`, `GET /public/testimonials`, `GET /public/stats`, `GET /public/site-content`, `GET /public/gym-branding` and `GET /public/sitemap.xml`.

The frontend public pages: home, gym list and detail, membership, subscription (SaaS pricing), tools (BMI, calorie, one rep max and protein calculators), about, contact, help, FAQ, and the terms, privacy, refund and cookie pages.

## Background jobs

`backend/src/jobs/scheduler.ts`: membership expiry sync, expiry reminders (once per membership), fee reminders (once per fee), payment reconciliation and subscription dunning. Idempotent. Run at server boot and hourly, through `GET/POST /internal/cron` with `CRON_SECRET`, or once with `npm run jobs`.

## Seed data

`npm run seed` in `backend` runs three scripts: `seedSuperAdmin.ts` (platform admin), `seedGyms.ts` (approved demo gyms with plans) and `seedDemoData.ts` (members, trainers, staff, memberships, fees, attendance, bookings, workouts, notifications, enquiries, SaaS plans and subscriptions, FAQs). Testimonials are intentionally not seeded.

Passwords are defined in the scripts and are not repeated in documentation. They are for throwaway databases only. All three scripts refuse to run when `NODE_ENV=production` unless `ALLOW_PRODUCTION_SEED=1`. If they were ever run against a shared database, rotate every seeded password.

## Frontend

React 19, Vite, React Router, TanStack Query for server state, Zustand for auth, theme and notification state, React Hook Form with Zod for forms, Axios with a refresh-and-retry interceptor in `frontend/src/services/api.ts`, Tailwind CSS v4 with design tokens in `frontend/src/index.css`. Dashboards live under `/dashboard` (member, trainer, staff), `/admin/gym` and `/admin/super`, behind `ProtectedRoute`. Page metadata comes from `usePageMeta`. Web Vitals are reported to `VITE_WEB_VITALS_ENDPOINT` when set.

## Backend

Express 5 and TypeScript. Routes in `backend/src/routes`, handlers in `controllers`, business rules in `services`, shared helpers in `utils`, Zod schemas in `utils/validators.ts`. PDFs (receipts and workout slips) are generated with pdfkit and streamed as `application/pdf`. Tests are in `backend/tests`.

## Folder structure

```text
VajraFitness/
  api/            Vercel function entry
  backend/
    prisma/       schema.prisma and migrations
    scripts/      seed scripts and backup.sh
    src/          app.ts, server.ts, controllers, routes, services, middlewares, jobs, utils
    tests/        Vitest suites
  frontend/
    public/       manifest, sitemap, robots.txt, fonts, images
    src/          pages, layouts, components, store, services, hooks, utils, seo
  mobile/         Expo app
  scripts/        dev-db.mjs
  docs/
```
