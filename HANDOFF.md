# Handoff

Project: Kavach Fitness, a multi-tenant gym management platform for Indian gyms.
Branch: `staging` (`main` is production). Main reference: [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md).

## Start here (next session)

Rules: never touch the Neon DB in `backend/.env`; use only local Postgres (`vajra_admin:vajra_secure_pass@localhost:5432`, db `vajra_fitness_qa`, tests on `vajra_fitness_test`). Run the API with `npm run dev:local` in `backend/` (port 5000) and the web with `npm run dev -- --port 5173` in `frontend/`. No git commits; the user pushes. Check with backend `npx tsc --noEmit`, frontend `npx tsc -b`, `npm run lint`, `npm run build`.

Logins (local QA): admin `admin@kavachfitness.com` / `admin123`; owners `owner@ironvalley.com`, `owner@powerhouse.com` / `gym123`; trainer `suresh.nair0@demo.in`, staff `vikram.kamble2@demo.in`, member `radhika.menon4@demo.in` / `Demo@1234`.

2026-11-03 (planning only, nothing pushed):

- Decided: GST stays added on top, only for gyms with a GSTIN (no change to `commission.ts`). Gyms and users with money rows are soft-deleted (deactivated or suspended), not deleted. Web refresh with no cookie returns 401. Features that need outside keys (Razorpay Route, R2, SMS) are built in test mode behind env flags and mocked in tests.
- Changed: `refresh` in `auth.controller.ts` returns 401 again when there is no refresh token, so the mobile-auth test should pass. The web client treats 401 and 204 the same. The test has not been re-run yet.
- Next: the five workstreams in the local `PLAN.md` (Phase 3): money, hardening, onboarding, storage + exports, mobile. Then Playwright QA, `PROJECT_CONTEXT.md` and final checks. Give each agent its own `TEST_DATABASE_URL` so vitest runs don't clash. Only the money workstream edits `schema.prisma`.
- `frontend/test-results/`, `frontend/playwright-report/` and `/playwright/` (QA screenshots) are now in `.gitignore`. The `.env.example` changes only add empty or public values (`CRON_SECRET=""`, `METRICS_TOKEN=""`, `VITE_SITE_URL`). gitleaks isn't installed locally, so CI's security workflow is the only secret scan. Typecheck was clean for backend and frontend at the start of the session.

Done (2026-10-29 to 2026-11-01), tasks 1-6 from the last list:

- Gym identity fields (name, address, city, state, phone, email, GST) can't be saved by the owner. `PUT /api/gym/my-branch` puts them in one open `ApprovalRequest` (`submitGymChange` / `decideRequest` in `backend/src/services/approval.service.ts`). Owner sees them read-only with "Request a change" (`GymProfileEditor.tsx`); `GET /api/gym/my-branch/change-requests`. Admin approves or rejects at Admin > Approvals (`pages/superadmin/ChangeRequestsPanel.tsx`; `GET /api/admin/approvals`, `POST /api/admin/approvals/:id/decide`). The owner is notified.
- Gallery uploads: owners upload several photos (`POST /api/uploads?kind=GALLERY`), star one as cover. Gallery photos are public at `GET /api/images/:id`; other files stay behind signed links. Files are on local disk, which is not persistent on Vercel: move to R2 before production.
- Owner Settings no longer edits identity data; duplicate gym check (`backend/src/utils/duplicateGym.ts`) runs at vendor registration.
- PDFs (fee receipt, workout slip) share one layout in `backend/src/utils/pdf.ts`; amounts print as "Rs." because the built-in font has no ₹.
- Dashboards have a top bar (website links, switcher, notifications, theme, account menu) and a phone drawer (`DashboardShell.tsx`).
- Public gym page redesigned: full-bleed cover hero, scroll-lit About text, gapless photo bento (`GymOverviewPage.tsx`, CSS scroll-driven animations in `index.css`, no GSAP).
- The equipment 400 could not be reproduced after the DB sync.

Done (2026-11-02, local QA only; Neon still needs the two new migrations):

- Trainer invites: owner `POST/GET /api/trainers/invites`, `DELETE /api/trainers/invites/:id`. Public `POST /api/auth/accept-invite` ({token, name, password}) creates an ACTIVE trainer and logs them in. Page `/accept-invite?token=`. Owner UI in the Trainers tab (`components/gym-admin/TrainerInvites.tsx`). The owner also gets the invite link back.
- Gym `status` (e.g. `APPROVED`) is what public reads check; `isApproved` is kept in sync. Re-enrolling an active member returns 409 `ALREADY_MEMBER`. Duplicate gym check (name + city, phone, GST) runs at registration, on change requests and on approval (409 `DUPLICATE_GYM`).
- Gym `facilities` is a string array in the API.
- Discovery: `GET /api/gym` takes q, city, category, facility, minPrice, maxPrice, lat, lng, radiusKm, sort (relevance | price | distance | newest), page, limit (max 50). Plain array by default; `?paged=1` returns `{items, total, page}`. `GET /api/gym/cities`. Find gyms filters live in the URL (`GymDirectory.tsx`).
- Marketplace orders: models Order, PaymentEvent, CommissionRule, LedgerEntry, Refund (amounts in paise). `POST /api/orders` needs an `Idempotency-Key` header and returns 503 `PAYMENTS_DISABLED` without Razorpay keys. Webhook `POST /api/payments/webhook` dedupes events and, in one transaction, marks the order PAID and writes ledger rows (MEMBER_PAID, GYM_PAYABLE, PLATFORM_COMMISSION, GST_PAYABLE, summing to zero), then activates the membership. `GET /api/orders/mine`, `GET /api/owner/earnings`, `GET /api/admin/orders`. Commission math is in `backend/src/services/commission.ts` (`splitOrder`, default 10%, per-gym CommissionRule). "Buy online" button on the gym Plans page.

Next (open items, in order):

1. Click through all new screens in a browser: profile approval flow, gallery upload, admin approvals, invites, discovery filters, buy online, dashboard top bar at phone width.
2. Decide: are plan prices GST-inclusive (MASTER_PLAN assumed yes), or is GST added on top only for gyms with a GSTIN (current code)?
3. Orders and ledger rows block deleting a gym or user. Decide soft-delete or blocking.
4. Orders: add an order verify endpoint (activation only happens via the webhook, which cannot reach localhost without a tunnel). Guard against two different events for one payment creating two memberships. A purchase should extend an active membership instead of adding a new one.
5. Not built: refunds, Razorpay fee in the ledger, payouts (Route, T+7 weekly, min Rs 500), exports, mobile, hardening, PROJECT_CONTEXT.md.
6. Uploaded files are on local disk and not persistent on Vercel: move them to Cloudflare R2.
7. Discovery price filter and sort run in memory (fine for hundreds of gyms).
8. Mobile-auth "ignores a cookie in mobile mode": refresh now returns 401 again (2026-11-03). Re-run the test to confirm.

## Marketplace build (2026-10-27)

The product is moving from gym SaaS to a hybrid SaaS + marketplace (members buy memberships through Kavach, Kavach takes a commission, gyms get payouts). The full plan, decisions and roadmap are in the local, gitignored `MASTER_PLAN.md`. Decisions so far: hybrid model; commission on the pre-GST price with 18% GST on the commission and the Razorpay fee paid by Kavach (default 10%, per-gym override); payouts through Razorpay Route held 7 days then released weekly; files on local disk for now (Cloudflare R2 later).

Done:

- **Routes instead of tabs (roadmap phase 0).** Every dashboard page has its own URL inside `AdminLayout`, `OwnerLayout`, `MemberLayout` or `TrainerLayout` (`components/shell/DashboardShell.tsx`): `/admin/*`, `/owner/*`, `/trainer/*`, `/staff`, `/dashboard/*`, `/bookings`, `/profile`, `/notifications`. Old URLs redirect (`/admin/super` → `/admin`, `/admin/gym` → `/owner`, `/admin-login` → `/admin/login`). The dashboards were not split into one file per page; each layout tells the existing dashboard which section to show. `vercel.json` noindex covers the new paths.
- **Foundations (phase 2).** `npm run dev:local` (backend) runs against the local qa db and refuses non-local hosts. A DB outage returns 503 `DB_UNREACHABLE` and no longer logs users out. `canAccessGym` in `utils/tenant.ts` replaces the copied ownership checks. Reset and activation tokens are stored as sha256. `/api/v1/*` serves the same routes as `/api/*`. New endpoints use `{ error, code }`. A `Job` table with retries (`jobs/queue.ts`, run from the cron). Uploads: `POST /api/uploads?kind=` (raw body, magic-byte check, 3 MB images / 5 MB docs), `GET /api/uploads/:id/link` (5-minute signed URL), `GET /api/files/:token`, stored under `UPLOAD_DIR`. Logs redact passwords, tokens and secrets.
- **Member at many gyms (phase 3).** `MemberDetails` is unique on `(userId, gymId)`, `User.memberProfiles` is a list. Member endpoints take `X-Gym-Id` or `?gymId=`, otherwise the default gym. `GET /api/members/my-gyms`. Joining another gym adds a row. `/auth/me` still returns one `memberDetails`.
- **Shared UI pieces.** `components/ui/`: `DataTable` + `useTableQuery`, `StatusBadge`, `Wizard`, `FileDrop`, `DiffView`, `PageHeader`. Used so far only on `/admin/users`.
- Migration `20261027000000_foundations_multi_gym` (tested on local dbs only).

- **Member gym switcher and DB-outage handling (web + mobile).** Web: `store/useGymStore.ts` (saved as `vf-member-gym`), the API client sends `X-Gym-Id` for members, a picker in `MemberLayout` when the member has 2+ gyms, "Join this gym" / "Join another gym" wording, one toast for 503 `DB_UNREACHABLE` and no logout on it, and toasts with the same text don't stack. Mobile: `getGymId` in `api/client.ts`, a picker on the member home, and the unreachable screen instead of signing out. Mobile was only typechecked and unit-tested (29/29), not run on a device.

Wave 2 backend stopped early. Done: migration `20261028000000_approvals_onboarding` (Gym status/slug/geo columns, facilities as TEXT[], ApprovalRequest/Event/Document, TrainerQualification/Availability/Invite, Facility) and `services/approval.service.ts` (transition rules) with `tests/approval-rules.test.ts` (green run not confirmed). Trainer status rename (ACTIVE→APPROVED) was taken out of the migration; do it later together with the code that reads it. Not done: approval endpoints, onboarding/invite APIs, `isApproved`→`status` switch, re-enroll fix (409 ALREADY_MEMBER), Facility in tests/setup.ts. Local QA db was synced with `db push`.

Next, in order (details in `MASTER_PLAN.md` §9):

1. Frontend for wave 2: `/list-your-gym` and `/partner/apply/:step` wizard with document upload, application status page, `/admin/approvals` inbox and detail (DiffView), owner trainer invites, `/invite/:token` and trainer profile wizard.
2. Discovery (phase 7): lat/lng, facilities, filters, distance, plan comparison, purchasable flag.
3. Orders and payments (phase 8), then ledger, refunds, Route payouts and reconciliation (phase 9). Razorpay test keys needed.
4. Exports (phase 10), mobile member flow (phase 11), hardening and launch (phase 12), and `PROJECT_CONTEXT.md`.

Known issues:

- Fixed 2026-11-03: web refresh without a cookie returns 401, and `tests/mobile-auth.test.ts` expects that.
- The full backend suite wasn't re-run after the last security test fix (that file passes alone).
- An owner can't add a user who already has an account at another gym (`addMember` and CSV import reject existing emails).
- Uploads won't work on Vercel until R2: the disk isn't persistent and the body limit is 4.5 MB.
- Error toasts cover the phone bottom bar. `ThemeSelector` (36px) and `DashboardSignOut` (40px) are under 44px. Admin pages still load all admin data at once.
- `Wizard`, `FileDrop`, `DiffView`, `PageHeader` and `DataTable` server mode have not been used on a real page yet.
- Enrolling again at a gym the member already belongs to resets their status there to PENDING, and the web join page still lists those gyms. Fix in the backend enroll (no-op or 409 for an existing active row) and hide joined gyms in the list.
- If the database is down during the first page load, a signed-in web user lands on `/login` (nothing is revoked; a reload signs them back in). The mobile gym choice isn't kept across restarts, the mobile unreachable screen still says "check your connection", and mobile has no "join another gym" entry.
- The QA demo seed was re-run on the local qa db, so the `@demo.in` accounts there were recreated (password `Demo@1234`).

## Older plan: borrow Khelja's workflow (2026-10-26)

Items 1, 3, 4 (except reviews), 5 (except `/bookings/:id`, `/saved`, `/welcome`), 6 (availability API is in wave 2) and 12 (partly, `/admin/system`) are done; see above.

Reference project: `I:\Web devlopment\khelja\kheljabranchdev` (sports venue marketplace). What to copy is the structure, not the code (it is FastAPI + CRA). Gym = venue, trainer slot = court slot.

Why login "broke": `backend/.env` points at Neon, and Neon's host doesn't resolve from this machine right now, so every DB call returns 500. Locally, run the backend with the qa database instead:
`DATABASE_URL=postgresql://vajra_admin:vajra_secure_pass@localhost:5432/vajra_fitness_qa?schema=public npx tsx src/server.ts` (in `backend/`). With that, `admin@kavachfitness.com` / `admin123` logs in.

Phase 1, make it work (do first):

1. Add a local `.env.local` override (or `npm run dev:local`) so dev never depends on Neon. Show a clear "Database unreachable" message instead of a generic 500.
2. Smoke test every login (member, trainer, owner, super admin) and every dashboard tab with Playwright against the qa DB. List each broken thing and fix it. No new features until this list is empty.

Phase 2, routes instead of tabs (Khelja pattern):

3. Admin: a visible `/admin/login` (keep `/admin-login` as a redirect) and an `AdminLayout` with a sidebar and one route per page: `/admin` (Today), `/admin/users`, `/admin/gyms`, `/admin/partner-applications` (approve gyms), `/admin/bookings`, `/admin/payments`, `/admin/website-requests`, `/admin/support`, `/admin/audit`, `/admin/system`.
4. Owner console `/owner/*`: overview, gym profile, plans and pricing, members, trainers, classes and schedule, bookings, attendance, earnings, expenses, staff, reviews, support, settings. Reuse the current gym admin tab components as page bodies.
5. Member: `/dashboard`, `/bookings`, `/bookings/:id`, `/profile`, `/notifications`, `/saved`, `/welcome` (first-login onboarding: pick a gym and a goal).
6. Trainer: `/trainer`, `/trainer/clients`, `/trainer/schedule`, `/trainer/availability`, `/trainer/earnings`.
7. Partner onboarding: `/list-your-gym` (landing and requirements), then `/partner/apply/:step` (gym details, photos, plans, bank details), with application status. The admin reviews it on `/admin/partner-applications/:id`.

Phase 3, features Khelja has and Kavach lacks:

8. Trainer availability (weekly hours) to replace the fixed 6:00 to 20:00 slot grid.
9. Checkout and booking confirmation pages (`/checkout/:ref`, `/booking/:ref/confirmation`), ready for Razorpay.
10. Reviews and owner replies on gym pages.
11. Notifications with deep links, plus a notification settings page.
12. Admin system status page (DB, Redis, jobs, last backup).
13. Staff PIN console for front-desk check-in (`/staff/login`).

Khelja rules worth copying: no fake stats or testimonials, 44px tap targets, sticky CTA on mobile flows, skeletons instead of spinners, motion behind `prefers-reduced-motion`, and one typed error code per failure.

## Current plan and status (2026-10-26)

Work was split into workstreams run by background agents. If a session ends, unfinished ones must be restarted from the briefs below.

Done:

- **Backend security (C).** Referral crediting can't break signup. Check-in uses the gym time zone (`APP_TIMEZONE`, default Asia/Kolkata) and a per-gym lock. Referral codes come from crypto. Website-request races are fixed. Added: single-use reset and activation tokens, extra input validation, http(s)-only image URLs, a stock oversell fix, a closed `/metrics` in production, a report-only CSP in `vercel.json`, and the migration `20261026000000_gym_website_request`. Deferred: class capacity under concurrent booking and server-time dates in reports and expenses. (Hashed tokens and the shared tenant helper were done later.)
- **Workflow (D).** Root scripts `dev`, `lint`, `typecheck`, `test`, `test:e2e`. CI job permissions and timeouts, env examples, the non-root nginx image on port 8080. Docker builds, `npm ci` and Playwright were not run.
- **Dashboards phase 1 (B).** Mobile layout fixes, a shared `EmptyState`, website request status, a referral member picker, scroll fades on wide tables, green subscription chips. Not checked in a browser since; the dark-mode table edge fade needs a look.

Finished later on 2026-10-26: A and E both pass tsc, lint and build. E redesigned every auth page (soft-skill look, double-bezel card, pill tabs, staggered fade-in) and made the cookie banner a compact bar on mobile. A added `USER MANUAL IMAGE` placeholders for trainer headshots and directory covers. Older note: Both agents were stopped while fixing imports after moving code: A in the files that use what it moved, E after splitting out `formParts`. Expect the frontend build to fail on broken imports until that is finished.

- **A. Public site and gym page.** Built with taste-skill v1: minimalist, micro animations, CSS only, no new dependencies, local images. An image carousel (arrows, dots, swipe, keyboard), a gallery, and sub-pages `/g/:slug/plans`, `/trainers`, `/gallery`, `/contact`. Sections with no data are hidden.
- **E. Login and sign-up pages.** Split layout with a big role photo. User, Trainer and Gym Owner tabs. Admin only at the hidden `/admin-login`, with no admin sign-up. A `/register` account-type chooser, show-password, remember me, confirm password, trainer specialisation, gym name and city for owners, and a role-based redirect. No social login and no OTP: they need provider keys. Last known issue: auth pages passed a `badge` prop that `AuthSplitLayout` didn't accept (6 TS errors). B later saw a clean build, so it is probably fixed, but run `npm run build` to confirm.
- **F. Gym profile data (done).** New `Gym` fields `description`, `phone`, `email`, `openingHours`, `galleryUrls` (migration `20261026120000_gym_public_profile`, tested on local qa only). `PUT /api/gym/my-branch` now saves them, always scoped to the owner's own gym, with validation, an audit row and public cache clearing. New "Gym profile" tab (`GymProfileEditor.tsx`), the public loader returns the fields, and the seed fills demo gyms with local photos. Test: `backend/tests/gym-profile.test.ts`. Left: photo upload (URLs only), the `GET /api/gym` directory list doesn't return the new fields, and the editor hasn't been clicked through in a browser.
- **B phase 2. Role features (done).** New endpoints `GET /bookings/slots`, `PATCH /bookings/:id/reschedule`, `GET /admin/overview` (tests in `backend/tests/dashboards.test.ts`). Member: slot picker for 7 days, upcoming/past bookings with reschedule and cancel, weight chart and streak, Find Gyms tab. Trainer: overview with earnings, Active/Pending clients, My Schedule, Earnings. Owner: recent bookings with Confirm. Super admin: head counts with 30-day change and an activity feed from `AuditLog`. Live panels refetch every 30 seconds and every change refreshes the affected data. Checked at 360/1280 in light and dark. Left: slots are a fixed 6:00 to 20:00 hourly grid (no trainer availability data), no trainer approve/suspend for the super admin, the weight chart's Y axis starts at 0, and only one wide table was checked for the dark edge fade.

Rules for every workstream: never touch the Neon database in `backend/.env` (use the local `vajra_fitness_test` or `vajra_fitness_qa` databases). Only F edits `schema.prisma`. Check pages at 360px and 1280px in light and dark. Finish with backend `npx tsc --noEmit`, frontend `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm run build`.

Next steps:

1. Finish A and E: review their changes with `git diff` and complete them from the briefs above.
2. Run the final checks above, the targeted vitest files and a Playwright pass.
3. Update README and docs for the new routes, the gym profile tab and the env.

Needs the owner:

- Apply migrations on Neon: `20261022191554_trainer_signup`, `20261025000000_fee_expense_date_indexes`, `20261026000000_gym_website_request`, `20261026120000_gym_public_profile`, `20261027000000_foundations_multi_gym`, `20261028000000_approvals_onboarding`, `20261102000000_marketplace_orders`. Check Neon after the earlier accidental `prisma db push`.
- Domain, Razorpay keys and plan prices, a WhatsApp/SMS provider, OAuth keys if social login is wanted, image storage if uploads are wanted, real photos, app store accounts.

## Brand

The product name is Kavach Fitness. The deployment still uses the existing Vercel project URL. Historical local database and metric identifiers retain their `vajra_*` names for compatibility; the mobile URL scheme and placeholder store IDs now use Kavach branding. See [branding/BRAND_PROPOSALS.md](branding/BRAND_PROPOSALS.md).

## Stack

Node 22, Express 5, Prisma 5, PostgreSQL, Redis (optional), React 19, Vite, Tailwind v4, Expo for mobile. Details are in the README.

## Run locally

```bash
npm install --legacy-peer-deps      # from the repo root
node scripts/dev-db.mjs             # local Postgres: create, push schema, seed
npm run dev --workspace=backend     # http://localhost:5000
npm run dev --workspace=frontend    # http://localhost:5173
```

## Entry points by role

| Role | Sign in | Sign up | Dashboard |
| --- | --- | --- | --- |
| Member | `/login` | `/register/member` (`?ref=CODE`) | `/dashboard` |
| Trainer | `/trainer/login` | `/trainer/register` (owner approves) | `/trainer` |
| Staff | `/login` | owner creates them | `/staff` |
| Gym owner | `/partner/login` | `/partner/register` | `/owner` |
| Super admin | `/admin/login` (`/admin-login` redirects, noindex) | none | `/admin` |

Public gym pages: `/gyms/:id` and `/g/:slug`.

## Features added recently

- Role-specific login and signup pages (`frontend/src/pages/auth/`, route names in `frontend/src/utils/routes.ts`).
- Public gym page (`PublicGymSitePage`) for both URL forms. `GET /api/public/sites/:slug` looks a gym up by `subdomain`.
- Partner website request: the gym owner posts a slug (`/api/website-requests`), the super admin approves or rejects it, and approval writes the slug to `Gym.subdomain`.
- Member self check-in (`POST /api/attendance/my/check-in`) and referral codes (`/api/referrals`, `?ref=` on `/register/member`).
- Light and dark theme only (`useThemeStore`).
- Trial length is 14 days (`TRIAL_DAYS` in `subscription.service.ts`).

## Database migrations still to apply

Run `npm run db:migrate --workspace=backend` against production with the direct Neon URL before merging to `main`.

1. `20261022191554_trainer_signup`: trainer city, experience and status columns.
2. `20261025000000_fee_expense_date_indexes`: indexes on `Fee(gymId, paymentDate)` and `Expense(gymId, date)`.
3. `20261026000000_gym_website_request`: the `GymWebsiteRequest` table.
4. `20261026120000_gym_public_profile`: gym description, phone, email, opening hours and gallery.
5. `20261027000000_foundations_multi_gym`: members at many gyms, the `Job` table.
6. `20261028000000_approvals_onboarding`: gym status, approval requests, trainer onboarding tables.
7. `20261102000000_marketplace_orders`: orders, payment events, commission rules, ledger, refunds.

## Cron

`vercel.json` calls `/api/internal/cron` daily at 03:00 UTC. The route needs `Authorization: Bearer $CRON_SECRET`, so set `CRON_SECRET` in Vercel.

## Headers and indexing

The API sets an enforced Content-Security-Policy through helmet (`backend/src/app.ts`). The static site CSP in `vercel.json` is `Content-Security-Policy-Report-Only`, so it only reports. Search engines are kept out of private pages by `frontend/public/robots.txt`, a `noindex, nofollow` meta tag on the admin login, and an `X-Robots-Tag` header in `vercel.json` for login, register, `/admin`, `/owner`, `/trainer`, `/staff`, `/dashboard`, `/bookings`, `/profile` and `/notifications`.

## Tests

```bash
npm test --workspace=backend            # vitest, 133 tests, about 12 minutes, needs Postgres
npx tsc -b && npm run lint              # in frontend
npm run test:e2e --workspace=frontend   # Playwright smoke specs
npm run audit:a11y --workspace=frontend # accessibility spec
```

## SEO and accessibility

Done: page titles and meta, `sitemap.xml` (served from `/api/public/sitemap.xml`), `robots.txt`, `llms.txt`, manifest, an axe-based Playwright accessibility spec.
Not done: Lighthouse runs, an automated SEO check, a full screen reader pass.

## Known gaps

- Razorpay keys are not set, so online payment is off.
- SaaS plan prices have not been decided.
- No WhatsApp or SMS sending, only email.
- Gyms have no real photos yet.
- Expo, Google Play and Apple developer accounts are not created. The mobile bundle id is a placeholder.
- Gyms have no rating field. Owners can upload gallery photos (`POST /api/uploads?kind=GALLERY`), but files go to local disk, which is not persistent on Vercel. They need Cloudflare R2 first.
- `kavachfitness.in` is not registered. `robots.txt`, the sitemap and the `SECURITY.md` email point at it.

## Next steps

1. Apply the seven migrations above to production.
2. Move uploads to Cloudflare R2.
3. Register the domain and set `FRONTEND_URL`, `CORS_ORIGINS` and `PUBLIC_SITE_URL`.
4. Add Razorpay keys, set plan prices, set `CRON_SECRET`.
5. Open a pull request from `staging` into `main`.
