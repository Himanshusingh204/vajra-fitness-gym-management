# TODO — Vajra Fitness Production-Ready Upgrade

This document tracks everything that needs to be fixed, implemented, removed, tested, or reviewed for the Vajra Fitness Gym Management SaaS.

Legend: `[ ]` = pending, `[x]` = completed, `[~]` = in progress.

---

## Audit

- [x] Inspect complete project structure (frontend/backend/docs/configs)
- [x] Identify frontend framework (React 19 + Vite 8 + TS + Tailwind v4) and backend framework (Express 5 + TS)
- [x] Identify database technology (PostgreSQL) and ORM (Prisma 5.22)
- [x] Inspect authentication (JWT access + httpOnly rotating refresh cookie, argon2/bcrypt)
- [x] Inspect every API endpoint and route file
- [x] Inspect every database model (41 models in schema.prisma)
- [x] Inspect forms and input fields
- [x] Inspect all dashboards (Super Admin, Gym Admin, Trainer, Member)
- [x] Inspect all existing pages
- [x] Inspect CSS/layout problems
- [x] Inspect unused/dead components and duplicate code
- [x] Inspect demo/mock/seed data
- [x] Inspect environment variables and secrets handling
- [x] Inspect database queries, error handling, validation, tenant isolation
- [x] Inspect security vulnerabilities, responsive/mobile behavior

---

## Security (critical)

- [x] **Webhook signature bug**: `express.json()` ran before `express.raw()` on `/api/payments/webhook` — raw parser now mounted first (app.ts)
- [x] **Stale compiled seed scripts removed from git** (contained plaintext demo passwords); gitignore updated for `scripts/*.js`
- [x] **Fail-open subscription design**: no subscription record → now a bounded default FREE/TRIAL tier (25 members / 5 trainers / 5 staff / 1 branch / 5 classes + core features) via `DEFAULT_TRIAL` in entitlements.service.ts + subscription.middleware.ts; `requireFeature`/`isFeatureEnabled`/`assertGymCapacity` enforce it. No more unrestricted access.
- [x] **`requireWriteAccess` now applied to ALL tenant write routes** (members, fees, staff, workouts, bookings, etc.) and is method-aware (GETs stay readable, mutations blocked when read-only)
- [x] **`GET /api/members/gym/:gymId` PII exposure** — trainers/staff now get name-only; email/phone restricted to gym owner/Super Admin
- [x] **`enrollMember` moves users between gyms** — now guarded: blocks switching gyms while the member has an ACTIVE/SUSPENDED/FROZEN membership or PENDING/OVERDUE fees (member.controller.ts)
- [x] **Webhook body ordering fixed** (see above)
- [x] **Suspected IDOR on PDF downloads / fee receipts** — verified safe: `getFeeReceiptPDF` (fee.controller.ts) and `getWorkoutSlipPDF` (workout.controller.ts) both enforce owner/self/trainer checks before emitting PII
- [ ] **No hard `deletedAt` anywhere**; deletion is inconsistent (`isActive` vs `status`). Standardize soft-delete.
- [x] **CSRF** — refresh flow is CSRF-safe: `SameSite=Strict` httpOnly cookie + Origin/Referer allowlist check on `/api/auth/refresh`
- [x] **Open redirects** — audited: no `res.redirect` in backend; activation/reset links always point to `FRONTEND_URL`
- [x] **Information leakage** — global error handler verified (no stack traces/SQL leaked; only generic messages)
- [ ] **Tenant data leakage** — every tenant query must filter by gymId; never trust IDs from browser
- [ ] **Do not expose API keys / credentials in frontend JS** — verify no Razorpay/W3Forms keys in frontend
- [x] **`ALLOW_PRODUCTION_SEED` removed from render.yaml** (no longer auto-seeds default credentials in prod; seed only runs when explicitly enabled)
- [x] **createEnquiry now verifies gym exists + is approved** before storing
- [x] **Brand cleanup**: "Iron Pulse" residue removed from FloatingActions, pdf.ts, metrics.ts, server.ts, .env.example files, load tests, RUNBOOK.md

## Authentication

- [x] Audit login/register/password flows (JWT + refresh rotation + reuse detection verified)
- [x] Verify password hashing (argon2/bcrypt) — no plaintext
- [x] Verify logout invalidates tokens (refresh rotation)
- [x] Verify password reset is secure (one-time tokens)
- [x] Verify email verification/activation flow (one-time activation tokens)
- [~] Brute-force / rate-limit coverage — audit which auth endpoints lack protection (logout, enquiry PUT, booking PATCH flagged)
- [x] Account enumeration minimization — verified: login returns generic "Invalid credentials"; forgot-password returns a generic message; register 409 is standard practice
- [x] Suspended/inactive accounts blocked at all protected endpoints — auth.middleware re-checks `isActive` + `tokenVersion` on every request (403)

## Input Validation

- [~] **Apply zod validation to query and params, not just body** — `validate` middleware supports `['params']`/`['query']`; wired into member, fee, workout routes (id/gymId/memberId UUIDs). Extend to remaining routes.
- [x] **Mobile number validation**: Indian mobile, `+91XXXXXXXXXX` or 10 digits, valid leading digit (6-9), rejects 20+ digits/alphabets/symbols/repeats/sequential fakes (normalizeIndianMobile, `indianPhone`, `optionalIndianPhone`)
- [x] **Email validation** server-side: syntax, domain, length (max 254), no spaces (normalized lowercase), uniqueness via Prisma unique index
- [x] **Name**: reasonable length (2-60), no HTML/script injection, allow spaces (`username` schema)
- [x] **Address**: max length, sanitize (strip HTML/control chars), prevent XSS (`sanitize`)
- [x] **Pincode**: exactly 6 digits, numeric only (India), no leading zero
- [x] **Price/Fee**: numeric, positive, reasonable maximums (1e7/1e8 caps across fee/plan/price schemas)
- [~] **Date/DOB**: valid date, not future, reasonable age range (basic `dateStr` validity; future/age-range refinements pending)
- [x] **Percentage**: bounded where used (bodyFat 1-100, discount 0-1e7)
- [x] **Description**: max length, sanitize, prevent XSS (`sanitize`)
- [x] **Password**: strong rules (min 8, letter+number) applied to register/reset/activate/change-password
- [~] **IDs**: never trust IDs from browser; verify authorization + tenant relationship (uuid coercion done; ownership checks partially verified)
- [ ] Add DB constraints where appropriate (unique phone, valid enum values via CHECK constraints)

## Database

- [~] Create baseline migration matching current `schema.prisma` (fix drift) — money-type migration added (`20260811000000_decimal_money_types`); dev DB history still needs `prisma migrate resolve --applied 20260806000000_init` or a reset (see DEPLOYMENT.md)
- [x] Verify `SaaSPlan` shape: seedDemoData.ts now uses `monthlyPrice/quarterlyPrice/...` (was `price`/`billingCycle`) — seed no longer crashes
- [x] Fix `seedDemoData.ts` which used removed `SaaSPlan.price/billingCycle` fields (seed fails) — DONE
- [x] Consistent money types: `Expense.amount`, `Product.purchasePrice/sellingPrice`, `Sale.total/finalAmount` (+ `discount/tax` + `SaleItem.unitPrice/total`), `Payslip.basicSalary/netPay` (+ `bonuses/deductions`), `Equipment.purchaseCost`, `EquipmentMaintenance.cost`, `Referral.rewardValue` converted to `Decimal(10,2)`; code updated to `.toNumber()` where arithmetic happens; JSON still serializes as numbers via the `Prisma.Decimal.prototype.toJSON` override
- [ ] Consider adding `deletedAt` soft-delete columns
- [x] Add partial unique index for active subscription (migration `20260806000003_unique_active_subscription`)
- [x] Add indexes for common query patterns / tenant scoping — schema already comprehensive (`@@index([gymId])` + composite `[gymId, status]`, `[gymId, checkIn]`, `[memberId, checkIn]`, `[gymId, status, endDate, memberId]`, etc.)
- [x] Document backup before any destructive migration (RUNBOOK.md has backup/restore + migration replay procedures)

## Super Admin

- [ ] Redesign Super Admin dashboard — minimal, professional, information-dense, sidebar navigation
- [ ] Super Admin analytics section (real DB data, no fake stats)
- [ ] Super Admin CMS (DB-backed content: hero, stats, features, testimonials, FAQs, pricing, contact, SEO, social, about, announcements)
- [ ] Gym management: details / activate / suspend / delete with confirmation
- [ ] Users: activate / suspend / delete
- [ ] Memberships / Trainers / PT Bookings / Workouts / Branch Requests / Subscriptions / Payments / Notifications / Contact Messages / Security / System Logs / Settings sections
- [ ] Super Admin audit-log viewer

## Gym Admin

- [ ] Sidebar-based dashboard navigation (Dashboard, Members, Memberships, Trainers, Workouts, PT Bookings, Branches, Payments, Reports, Notifications, SaaS Subscription, Settings)
- [ ] **Fix Fees page broken CSS / hidden content** (desktop/tablet/mobile, tables, cards, forms, modals, pagination, filters, empty/error states, overflow)
- [ ] **Remove modules: Inventory, Expenses, Classes, Payroll** — sidebar links, pages, routes, components, APIs, models, imports, styles, services
- [ ] **My SaaS Subscription** section: plan, status, dates, billing cycle, features, limits, usage, remaining capacity, upgrade/renew/billing history
- [ ] Trainer management: activate / suspend / remove
- [ ] PT booking management: view / approve / reject / cancel / delete, filters (trainer/member/date), status management
- [ ] Branch management: register new branch → Super Admin approval; branches use existing subscription branch allowance
- [ ] No unrelated features shown

## Trainer

- [ ] Dashboard: members (scoped), workouts, PT bookings (own only)
- [ ] Workout creation per permissions (not another gym's data)
- [ ] PT bookings scoped to own

## Member

- [ ] Dashboard: membership, my workout, PT, profile
- [ ] Only own data (no cross-member access)
- [ ] Auto-suspend expired membership — block member-only functionality while preserving history

## Membership

- [ ] Auto-suspend expired memberships (detect expiration, mark expired, deactivate access, preserve history, notify admins)
- [ ] Distinguish Active / Expiring Soon / Expired / Suspended / Cancelled
- [ ] Membership expiry job verification (scheduler.ts)
- [ ] Expiring-soon + expired notifications to admins/members
- [ ] Fee/membership validation (price, duration, dates)

## PT Booking

- [ ] Gym Admin: view / approve / reject / cancel / reschedule / delete
- [ ] Filters by trainer, member, date
- [ ] Status management
- [ ] Trainer sees own bookings only; Member sees own bookings only
- [ ] Authorization + rate limiting on booking PATCH

## Workout

- [ ] Keep existing workouts; improve system
- [ ] Gym owner/admin can manage workouts
- [ ] Trainer can create workouts
- [ ] Member can view assigned workouts
- [ ] Fields: title, description, muscle group, difficulty, exercises, sets, reps, duration, rest, instructions, media
- [ ] Ownership/authorization enforced (no cross-gym modification)

## CMS

- [ ] DB-backed content model + API for: homepage hero, stats, features, benefits, testimonials, FAQs, pricing, contact, footer, SEO, social links, about, team, CTA, announcements
- [ ] Super Admin CMS UI to edit content
- [ ] **Platform statistics CMS-editable**: 10,000+ Active Members, 500+ Partner Gyms, 1,000+ Pro Trainers, 50+ Cities Covered (marketing numbers, not fake DB stats)

## Analytics

- [ ] Platform analytics: total/active/suspended/new gyms, members, membership growth, subscription revenue, MRR, trainer growth, PT activity, city distribution, gym growth over time, user growth, expiration trends, platform activity
- [ ] Real DB data only; no fake stats; empty states when no data

## Contact/API

- [x] Professional contact page: name, email, phone, subject, message
- [ ] W3Forms integration (server-side, key not exposed in frontend if architecture allows)
- [x] Message field: max 1000 words + server-side char limit (6000) + live counter (0 / 1000 words) on ContactPage
- [x] Validate all contact fields before submission (client + `contactSchema` server-side)
- [x] `createEnquiry` now validates the gym exists + is approved (was missing gym-existence check)
- [ ] Contact messages viewable by Super Admin

## UI/UX

- [ ] Remove "Vajra Fitness Platform 2.0 is Live" from home screen — replace with realistic production message
- [ ] **Remove team section** (Rahul Sharma/Anita Desai/Vikram Singh) → "The Developer Behind the Platform — Himanshu — Full Stack Developer"
- [ ] Update homepage stats to CMS-driven marketing numbers
- [ ] Consistent sidebar system (active state, collapse, mobile drawer, icons, role-based)
- [ ] Professional, consistent typography/spacing/buttons/forms/tables/modals/alerts/badges
- [ ] Avoid cluttered dashboards, excessive cards, random gradients
- [x] Fix brand inconsistency: "Iron Pulse" residue removed (FloatingActions WhatsApp msg, pdf.ts footer/header, metrics names, server.ts service name, .env.example SMTP_FROM/DB names, load tests, RUNBOOK)
- [ ] Accessibility: keyboard nav, labels, focus states, contrast, aria

## Responsive Design

- [ ] Test at 320/375/390/414/768/1024/1280/1440/1920
- [ ] Fix horizontal scroll, broken tables, hidden content, overlapping elements, sidebar/modal/form overflow
- [ ] Fees page responsiveness (see Gym Admin)

## Demo Data Removal

- [ ] Remove demo/sample data from production path (demo gyms, members, trainers, payments, bookings, testimonials)
- [ ] Keep only 5-6 sample records where genuinely needed, clearly identified
- [ ] `seedGyms.ts` + `seedDemoData.ts` must not run in production (guard ALLOW_PRODUCTION_SEED; remove hardcoded '1' in render.yaml)
- [ ] Don't derive production stats from demo data
- [ ] Remove stale compiled seed JS from git
- [ ] HomePage 'Iron Core Jaipur' demo testimonial reference — clean up

## Deployment

- [x] Fix `deploy-netlify.yml` — now passes `VITE_API_URL` from GH secrets (deployed bundle no longer calls localhost:5000)
- [x] Fix frontend/Dockerfile — `VITE_API_URL` build ARG added (build-time baking)
- [ ] Consolidate 3 competing deploy workflows (deploy.yml + netlify + vercel fire on main)
- [x] Remove redundant `ci.yml` (no tests; deploy.yml does the full quality gate)
- [ ] Redis + frontend healthchecks in docker-compose
- [x] Remove `ALLOW_PRODUCTION_SEED=1` from render.yaml (seed only when explicitly enabled)
- [ ] Verify production env var setup end-to-end (CORS_ORIGINS, FRONTEND_URL, SMTP, Razorpay, REDIS_URL)
- [ ] Add healthcheck/startup handling for seed

## Documentation

- [ ] Create professional README.md (Iron... Vajra Fitness): features, tech stack, structure, installation, env vars, DB setup, dev, build, deploy, roles, security, SaaS architecture, troubleshooting, maintenance
- [ ] DEPLOYMENT.md exists — update with pre-deployment checklist + where each config changes
- [x] Fix stale env docs: root .env.example DB creds now match docker-compose (vajra_admin/vajra_fitness)
- [x] Document `ALLOW_PRODUCTION_SEED` behavior (seed guard)
- [x] Remove/update stale "Iron Pulse" references in docs

## Testing

- [ ] Auth: register, login, logout, password reset, invalid creds, unauthorized access
- [ ] Gym: registration, approval, suspension, deletion, reactivation
- [ ] Members: create, edit, suspend, activate, delete, membership expiration
- [ ] Trainers: create, edit, suspend, delete, workout access
- [ ] Workouts: create, edit, assign, view
- [ ] PT: create, approve, cancel, delete, authorization
- [ ] Subscription: display, expiration, limits, renewal
- [ ] Branch: register, approve, reject, subscription limits
- [ ] Contact: validation, 1000-word limit, submission
- [ ] Security: unauthorized access across Super Admin / Gym Admin / Trainer / Member / different gyms
- [ ] Add backend tests for newer modules (inventory, expenses, equipment, classes, payslips, referrals, bookings, admin, PDFs)
- [ ] Add tests running against migrations, not just `db push`
- [ ] Run `npm test` (backend) + `npm run build` (backend + frontend)
- [ ] Frontend lint: `npm run lint` (oxlint)

---

## Final

- [ ] Re-read this file, verify every completed task, add new discoveries
- [ ] Run app, test major user flows, check DB/APIs/auth/authorization/tenant isolation/validation/responsive/production build
- [ ] Check console + server errors, exposed secrets, dead code
- [ ] Final summary: Completed / Remaining / Security / Database / Files removed & added / Production checklist
