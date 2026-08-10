# Vajra Fitness — Phases & Todo Tracker (LIVING DOCUMENT)

**Purpose:** Single source of truth for the rollout plan. Update statuses here as work
is completed. Do **not** delete completed items — flip the checkbox instead.

Legend: `[x]` done · `[ ]` pending · `[~]` in progress

---

## Phase 1 — Critical Fixes (Security & Reliability)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Monetary `Float` → `Decimal` in Prisma schema + migration | [x] | All money fields on `Decimal(10,2)` (Fee, Membership, Product, Sale/SaleItem, Expense, Equipment, Payslip, Referral); migration `20260811000000_decimal_money_types` |
| 2 | Missing database indexes | [x] | Verified: `(gymId,status,endDate)`, `(gymId,status)`, `(gymId,checkIn)`, `(userId,isRead,createdAt)`, `(gymId,action,createdAt)` all present |
| 3 | Redis-backed rate limiting + login lockout (multi-instance safe) | [x] | `utils/redis.ts` + `RedisRateLimitStore` (hybrid: Redis when available, in-memory fallback) + shared `utils/bruteForce.ts` lockout |
| 4 | Structured logging + correlation/request IDs | [x] | `utils/logger.ts` (JSON, AsyncLocalStorage) + `requestContext.middleware.ts` (`X-Request-Id`) |
| 5 | Health + readiness endpoints with dependency checks | [x] | `/api/health`, `/api/ready` in `app.ts` (DB ping) |
| 6 | Payment retry + failed-payment handling | [x] | `runPaymentReconciliation` job: stale CREATED orders → FAILED + member notify; PENDING → OVERDUE fees |
| 7 | Subscription dunning (notification sequence on failed SaaS payment) | [x] | `runSubscriptionDunning` job: 24h reminder (deduped), 72h → PAST_DUE escalation |

---

## Phase 2 — Feature Completion

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8 | Multi-branch: middleware isolation, branch-scoped APIs, UI | [x] | `branch.routes.ts`/`branch.controller.ts` (CRUD + capacity via `MULTI_BRANCH` feature + `maxBranches`); `branchId` filters on members/staff/classes/attendance; attendance stamped with member/staff branch; Gym Admin dashboard — branch CRUD panel + per-tab branch filters + assignment selects |
| 9 | White-label: custom subdomain/domain, branded member portal | [ ] | `Gym.branding` fields exist; no routing/validation |
| 10 | QR check-in: member QR generation, scanner endpoint, offline queue | [ ] | Not implemented |
| 11 | Marketing automation: triggers (expiry/birthday/inactive), multi-channel | [ ] | Only basic notifications + scheduler reminders |
| 12 | WhatsApp/SMS provider abstraction + consent | [ ] | Not implemented |
| 13 | File storage: S3/R2 adapter, signed URLs, upload endpoints | [ ] | Not implemented |
| 14 | Member import (CSV wizard, validation, transactional) | [x] | `POST /api/members/gym/:gymId/import` — RFC-4180 parser, validation, dedupe, capacity check, transactional insert, activation emails, per-row summary |

---

## Phase 3 — Production Hardening

| # | Item | Status | Notes |
|---|------|--------|-------|
| 15 | Log aggregation config (JSON → Loki/Datadog) | [ ] | Depends on #4 |
| 16 | Prometheus metrics endpoint (`/metrics`) | [x] | `prom-client` registry: request rate/duration (route+status labels), background-job counters; optional `METRICS_TOKEN` bearer auth |
| 17 | OpenTelemetry distributed tracing | [ ] | Not implemented |
| 18 | E2E test suite (customer journey) | [ ] | Unit/integration tests exist (52 passing); no E2E |
| 19 | Security test suite (OWASP top 10 / authz edge cases) | [ ] | `authorization.test.ts` covers IDOR basics |
| 20 | Load testing baseline (k6) | [x] | `backend/load/` — `smoke.js`, `load.js`, README (health, auth, public listing) |
| 21 | Backup/restore procedures + DR runbook | [x] | `RUNBOOK.md` — Neon PITR + logical dumps, restore procs, DR severity runbooks, quarterly checklist |
| 22 | API versioning strategy (`/api/v1`) | [ ] | Not implemented |

---

## Phase 4 — Polish & Launch

| # | Item | Status | Notes |
|---|------|--------|-------|
| 23 | Accessibility audit (WCAG 2.1 AA) | [ ] | Manual pass done; no automated axe pass |
| 24 | Performance optimization (bundle, queries, caching) | [~] | Entry bundle ~15 KB gzip; query tuning ongoing |
| 25 | Onboarding wizard for new gyms | [ ] | Not implemented |
| 26 | Documentation completion (API docs, runbooks, architecture) | [~] | `docs/`, `DEPLOYMENT.md`, audits exist |
| 27 | Final security review + penetration test | [ ] | Pending |

---

## Phase 5 — Product Expansion (from `Things needed to add.md`)

> Items below come from `Things needed to add.md`. Many on that list are **already
> implemented** — they are marked `[x]` here with their source files. The rest are
> genuine backlog. Duplicate Phase 2/4 items (e.g. QR check-in, WhatsApp/SMS) link
> to their existing row.

### Member Experience & Mobile

| # | Item | Status | Notes |
|---|------|--------|-------|
| 28 | Dedicated mobile app (React Native/Flutter) | [ ] | Not started |
| 29 | Biometric / QR check-in | [~] | QR check-in tracked as Phase 2 #10 (not implemented); biometric turnstiles not started |
| 30 | Diet & nutrition plans | [x] | `NutritionPlan` model, `nutrition.routes.ts`, `nutrition.api.ts` |
| 31 | Goal tracking & progress photos | [x] | `ProgressLog` (incl. `photoUrl`) + `progress.routes.ts` |
| 32 | Gamification & leaderboards | [ ] | Not implemented |
| 33 | Wearable integration (Apple Health / Google Fit / Fitbit) | [ ] | Not implemented |

### Payments & Billing

| # | Item | Status | Notes |
|---|------|--------|-------|
| 34 | Recurring subscriptions / auto-pay (e-mandate) | [ ] | Not implemented; fees are one-off today |
| 35 | Point of Sale (POS) for retail | [x] | `Product`/`Sale`/`SaleItem` + `inventory.routes.ts` (products, suppliers, sales) |
| 36 | Wallet / credit system | [ ] | Not implemented |
| 37 | Expense tracking | [x] | `Expense` model + `expense.routes.ts` + `expense.api.ts` |

### Marketing & Retention

| # | Item | Status | Notes |
|---|------|--------|-------|
| 38 | WhatsApp / SMS automation | [ ] | Tracked as Phase 2 #12 (not implemented) |
| 39 | Referral program | [x] | `Referral` model + `referral.routes.ts` + `referral.api.ts` |
| 40 | Lead-gen CRM (FB/IG ads) | [ ] | Basic `Enquiry` leads exist; no ad-channel import |
| 41 | Push notifications | [ ] | In-app notifications exist; no device push |

### Analytics & Reporting

| # | Item | Status | Notes |
|---|------|--------|-------|
| 42 | Churn / MRR / CLTV dashboards | [ ] | Basic revenue stats only (`reports.controller.ts`) |
| 43 | Trainer performance reports | [ ] | Not implemented |
| 44 | Peak-hours analysis / heatmaps | [ ] | Not implemented |
| 45 | Automated email reports | [ ] | Not implemented |

### Operations & Facilities

| # | Item | Status | Notes |
|---|------|--------|-------|
| 46 | Equipment maintenance tracker | [x] | `Equipment` + `EquipmentMaintenance` + `equipment.routes.ts` |
| 47 | Class / group fitness management | [x] | `GymClass` + `ClassBooking` + `class.routes.ts` |
| 48 | Staff payroll management | [x] | `Payslip` model + `payslip.routes.ts` + `payslip.api.ts` |
| 49 | Multi-language support | [ ] | Not implemented |
| 50 | Inventory management (low-stock alerts) | [x] | `Product`/`Supplier`/`SaleItem` + `inventory.routes.ts`; low-stock alerts not wired |

---

## Operational checklist

- [ ] Replace seeded demo credentials in production
- [ ] Configure real SMTP
- [ ] Enable Neon backups + test restore
- [ ] Submit sitemap to Google Search Console
- [ ] Run Lighthouse / axe on deployed URL
- [ ] Redis-backed rate limiting/lockout for horizontal scaling

---

## Change log

| Date | Work done |
|------|-----------|
| 2026-08-11 | Phase 2 #8 multi-branch complete: `branch.routes.ts` + `branch.controller.ts` (list/create/update/soft-disable, `_count` headcounts, first-branch free + `MULTI_BRANCH` feature gate + `maxBranches` capacity, last-active-branch + non-empty-branch disable guards). `branchId` scoping added to `getMembers`/`getStaff`/`getClasses`/`getAttendance`; `branchId` accepted on member/staff/class create; attendance stamped with the member/staff's branch. Gym Admin dashboard: Branches management panel in the Branch tab, branch filter dropdowns on Members/Staff/Attendance/Classes, per-row member branch assignment, branch columns. Backend + frontend typecheck, frontend lint + vite build clean, 52 backend tests passing. |
| 2026-08-10 | Merged `Things needed to add.md` into Phase 5 with accurate statuses — many features were already implemented (nutrition, progress/photos, expenses, equipment+maintenance, classes, payroll, referrals, POS/inventory). Backend security pass: referral, class (IDOR + waitlist), inventory (IDOR), app.ts, payslip type fixes. Build clean, 52 tests passing. |
| 2026-08-10 | Phase 1 complete: Redis-backed rate limiting + lockout (ioredis), structured JSON logging + `X-Request-Id` correlation, payment reconciliation job, subscription dunning job. Added `REDIS_URL`/`LOG_LEVEL` env vars. |
| 2026-08-10 | Phase 2.14 + Phase 3 partial: CSV member import API, Prometheus `/metrics` (prom-client, `METRICS_TOKEN`), k6 load scripts (`backend/load/`), DR runbook (`RUNBOOK.md`). |
