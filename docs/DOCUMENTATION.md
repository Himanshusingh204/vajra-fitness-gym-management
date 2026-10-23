# VajraFitness — Unified Technical & Platform Documentation

This document serves as the single comprehensive reference manual for VajraFitness, covering system architecture, domain data models, API contracts, mobile architecture, security policies, deployment guides, brand identity, and engineering standards.

---

## Table of Contents

1. [Executive Summary & Platform Overview](#1-executive-summary--platform-overview)
2. [System Architecture & Core Patterns](#2-system-architecture--core-patterns)
   - [System Context Diagram](#system-context-diagram)
   - [Monorepo & Single-Origin Hosting](#monorepo--single-origin-hosting)
   - [Multi-Tenancy & Data Isolation Model](#multi-tenancy--data-isolation-model)
   - [Request Execution Pipeline](#request-execution-pipeline)
3. [Domain Models & Database Architecture](#3-domain-models--database-architecture)
   - [Core User & Roles](#core-user--roles)
   - [Gyms & Branches](#gyms--branches)
   - [Membership Lifecycle & Packages](#membership-lifecycle--packages)
   - [Payments, Fees, Refunds & Invoicing](#payments-fees-refunds--invoicing)
   - [Attendance & Activity Logs](#attendance--activity-logs)
   - [SaaS Subscriptions & Entitlements](#saas-subscriptions--entitlements)
4. [API Specification & Service Contracts](#4-api-specification--service-contracts)
   - [Global Conventions & Error Envelope](#global-conventions--error-envelope)
   - [Route Groups & Access Gates](#route-groups--access-gates)
   - [Mobile Token Contract (`X-Client: mobile`)](#mobile-token-contract-x-client-mobile)
   - [Trainer Signup & Approval Lifecycle](#trainer-signup--approval-lifecycle)
   - [Public Directory & SEO Endpoints](#public-directory--seo-endpoints)
5. [Mobile Application (`mobile/`)](#5-mobile-application-mobile)
   - [Stack & Structure](#stack--structure)
   - [Authentication & OS Keychain Integration](#authentication--os-keychain-integration)
   - [Role-Based Mobile Navigation](#role-based-mobile-navigation)
6. [Security Policy & Threat Mitigation](#6-security-policy--threat-mitigation)
   - [Threat Model & Security Controls](#threat-model--security-controls)
   - [Authentication & Session Defense](#authentication--session-defense)
   - [Reporting Vulnerabilities](#reporting-vulnerabilities)
7. [Deployment, Infrastructure & DevOps](#7-deployment-infrastructure--devops)
   - [Infrastructure Blueprint (Neon, Vercel, Upstash)](#infrastructure-blueprint)
   - [Environment Configuration](#environment-configuration)
   - [Database Migrations Workflow](#database-migrations-workflow)
   - [Scheduled Background Jobs & Automation](#scheduled-background-jobs--automation)
   - [Automated Backups & Disaster Recovery](#automated-backups--disaster-recovery)
   - [CI/CD Workflows & Verification](#cicd-workflows--verification)
8. [Brand Identity & Design System](#8-brand-identity--design-system)
   - [Brand Concept & Symbolism](#brand-concept--symbolism)
   - [Color Palette & Tokens](#color-palette--tokens)
   - [Typography & Visual Elements](#typography--visual-elements)
   - [Official Brand Assets](#official-brand-assets)
9. [Contributor Guide & Engineering Standards](#9-contributor-guide--engineering-standards)
   - [Branching Strategy](#branching-strategy)
   - [Local Development Setup](#local-development-setup)
   - [Pre-Flight Verification & Quality Gates](#pre-flight-verification--quality-gates)

---

## 1. Executive Summary & Platform Overview

**VajraFitness** is an enterprise-ready, multi-tenant SaaS platform built for gym, fitness studio, and health-club businesses. It provides full-lifecycle gym management, including:
- **Member Management**: Self-service portals, membership plans, automated expiry tracking, freeze/renewal workflows.
- **Attendance**: Front-desk check-in, biometric/QR support schema, member visit histories.
- **Billing & Payments**: Integrated Razorpay online checkout, automated PDF receipts, full & partial refunds, fee ledgers, GST calculations.
- **Staff & Operations**: Role-based access for gym owners, managers, trainers, receptionists, and members; trainer commission/hourly tracking and approval workflow.
- **SaaS Subscription Engine**: Tiered B2B subscription billing for gym owners, automated 14-day trials, live feature entitlement gates, and platform invoicing.
- **Public Discovery & SEO**: Public gym directory, gym microsites, workout and nutrition tools (BMI, Calorie, 1RM, Protein), sitemaps, and metadata.

---

## 2. System Architecture & Core Patterns

### System Context Diagram

```mermaid
flowchart LR
  subgraph Clients
    W["Web Application<br/>React 19 SPA (Vite)"]
    M["Mobile Application<br/>Expo / React Native"]
  end
  subgraph Vercel
    CDN["Static Edge Network<br/>(frontend/dist)"]
    API["Express 5 Serverless API<br/>(api/index.ts)"]
  end
  PG[("PostgreSQL Database<br/>Neon (Pooled / Direct)")]
  RD[("Redis Instance<br/>Upstash / Local")]
  RZ["Razorpay Gateway<br/>(Orders, Payments, Refunds)"]
  SM["SMTP Service<br/>(Emails & Notifications)"]
  CR["Scheduler Engine<br/>(/api/internal/cron)"]

  W --> CDN
  W -->|/api requests| API
  M -->|/api requests| API
  CR -->|Bearer CRON_SECRET| API
  API --> PG
  API --> RD
  API --> RZ
  RZ -->|Webhook events| API
  API --> SM
```

### Monorepo & Single-Origin Hosting
VajraFitness operates as a monorepo configured with `npm workspaces` for `frontend` and `backend`:
- **Single Origin**: The frontend SPA and backend API are deployed together on Vercel. Static assets are served from `frontend/dist`, and `/api/*` routes are handled by the serverless Express function at `api/index.ts`. Web clients do not require cross-origin requests; cookies are strictly first-party (`SameSite=Strict`).
- **Server Entry**: In traditional Docker or standalone Node environments, `backend/src/server.ts` starts an HTTP server listening on port 5000.
- **Mobile Independence**: `mobile/` is kept outside root `package.json` workspaces to prevent Expo dependency collisions during Vercel builds.

### Multi-Tenancy & Data Isolation Model
VajraFitness follows a **logical multi-tenancy** model within a shared PostgreSQL database:
1. **Tenant Anchor**: Every tenant business is represented by a `Gym` record.
2. **Server-Side Identification**: The caller's tenant (`gymId`) is determined exclusively by server-side authentication (`req.user.userId`). Client-provided `gymId` headers or parameters are validated against authenticated ownership or staff records before any query executes.
3. **Database Scoping**: All tenant-scoped entities (`MemberDetails`, `StaffDetails`, `TrainerDetails`, `Fee`, `Attendance`, `Membership`, `GymClass`, `Product`, `Expense`) carry a foreign key `gymId` with composite indexes for rapid, partitioned lookups.
4. **Subscription Isolation**: Unpaid or expired gyms are restricted to read-only access via server-side subscription middleware.

### Request Execution Pipeline

1. **Edge & Static Routing**: Requests matching static files are served directly from the CDN. All `/api/*` routes route to Express.
2. **Security Headers (`helmet`)**: Sets strict `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy`.
3. **Context & Metrics**: Injects a unique `X-Request-Id` for request correlation and increments Prometheus HTTP metrics.
4. **Rate Limiting**: Rate limits are applied per client IP using Redis (falling back to memory):
   - Global `/api`: 200 requests / 15 minutes.
   - `/auth`: 15 requests / 15 minutes.
   - Sensitive mutations: 30 requests / minute.
5. **Subscription Gate**: For tenant endpoints, `requireValidSubscription` calculates the gym's live status (`TRIAL`, `ACTIVE`, `GRACE_PERIOD`, `EXPIRED`, `SUSPENDED`). `requireWriteAccess` rejects write mutations (`POST`, `PUT`, `DELETE`) with HTTP 403 `SUBSCRIPTION_READONLY` if the gym's plan has expired.
6. **Authentication & Authorization**: `authenticate` validates the JWT bearer token, confirms the user is active, and verifies the `tokenVersion`. `authorize([...roles])` enforces role-level boundaries.
7. **Validation & Controller**: Zod schemas validate `req.body`, `req.params`, and `req.query`. Prisma transactions execute the business logic, and cache-aside layers in Redis serve hot reads.

---

## 3. Domain Models & Database Architecture

The data layer is managed with **Prisma ORM** against PostgreSQL (`backend/prisma/schema.prisma`). All monetary values are stored using exact precision `Decimal(10, 2)`.

### Core User & Roles
- **`User`**: Central identity with `email` (unique), `password` (Argon2 hash), `phone`, `role`, `isActive`, and `tokenVersion` (for instant token revocation).
- **Roles**:
  - `SUPER_ADMIN`: Global platform oversight, SaaS plans, CMS, cross-tenant moderation.
  - `GYM_ADMIN`: Gym owner with full control over their own gyms and branches.
  - `BRANCH_ADMIN` / `MANAGER`: Scoped management over assigned branches.
  - `TRAINER`: PT bookings, assigned member workouts, class schedules.
  - `STAFF`: Front-desk operations, attendance marking, member inquiries.
  - `MEMBER`: Personal gym member profile, workout slips, fee receipts, class bookings.

### Gyms & Branches
- **`Gym`**: Gym business profile (`name`, `address`, `location`, `gstNumber`, `logoUrl`, `isApproved`, `brandColor`, `subdomain`, `customDomain`).
- **`Branch`**: Multi-location support (`gymId`, `name`, `address`, `status: PENDING | APPROVED | REJECTED`).

### Membership Lifecycle & Packages
- **`MembershipPlan`**: Catalog of gym packages (`name`, `duration` in days, `price`, `isActive`, `gymId`).
- **`Membership`**: Member subscription instance (`startDate`, `endDate`, `status: PENDING | ACTIVE | EXPIRED | SUSPENDED | FROZEN`).
  - **Renewal Chain**: Uses a recursive self-relation (`previousMembershipId` -> `renewals`) to maintain a complete renewal history.
  - **Freeze Mechanism**: `frozenAt`, `unfrozenAt`, and `freezeReason` support temporary membership pauses.

### Payments, Fees, Refunds & Invoicing
- **`Fee`**: Primary member payment ledger (`amount`, `paymentDate`, `dueDate`, `status: PAID | PENDING | OVERDUE | PARTIAL | REFUNDED`, `discount`, `tax`, `gstType: CGST_SGST | IGST`).
- **`PaymentOrder`**: Razorpay checkout linkage (`orderId`, `amount`, `status: CREATED | PAID | FAILED`).
- **Receipts**: Auto-generated PDF receipts streaming via PDFKit (`buildFeeReceipt`).
- **Refunds**: Full or partial refunds executed via `payment.service.ts` communicating with Razorpay's refund API, updating the fee to `REFUNDED` or `PARTIALLY_REFUNDED` with audit trail entries.

### Attendance & Activity Logs
- **`Attendance`**: Timestamped record (`checkIn`, `checkOut`, `status: PRESENT | ABSENT`, `source: MANUAL | QR | BIOMETRIC`, `gymId`, `memberId`, `staffId`, `branchId`).
- **Daily Safeguard**: Controller prevents duplicate member check-ins on the same calendar day.

### SaaS Subscriptions & Entitlements
- **`SaaSPlan`**: B2B subscription tier (`monthlyPrice`, `yearlyPrice`, quotas for `maxMembers`, `maxTrainers`, `maxStaff`, `maxBranches`, `features`).
- **`GymSubscription`**: Gym subscription lifecycle (`status: TRIAL | ACTIVE | GRACE_PERIOD | EXPIRED | SUSPENDED`, `trialEndsAt`, `gracePeriodEnd`, `billingCycle`, `razorpayOrderId`).
- **`SubscriptionInvoice`**: Formal platform invoices issued to gyms with GST breakdown (`cgst`, `sgst`, `igst`, `total`, `billingPeriod`).

---

## 4. API Specification & Service Contracts

All API endpoints are prefixed with `/api`.

### Global Conventions & Error Envelope
Standard responses return JSON. Errors consistently return:
```json
{
  "error": "Descriptive human-readable error message",
  "code": "OPTIONAL_ERROR_CODE",
  "issues": [
    { "path": "phone", "message": "phone must be a valid 10-digit Indian mobile number" }
  ]
}
```

### Route Groups & Access Gates

| Prefix | Access Level | Description |
|---|---|---|
| `/api/auth` | Public / Token | Authentication, signup, password recovery, profile management |
| `/api/public` | Public | Public gym profiles, SEO FAQs, testimonials, statistics |
| `/api/payments` | Authenticated | Razorpay order creation, payment verification, refunds, webhooks |
| `/api/saas` | Gym Admin / Super Admin | SaaS plan purchases, checkout, subscription management |
| `/api/admin` | Super Admin | Platform-wide analytics, tenant moderation, CMS content |
| `/api/gym` | Gym Admin / Staff | Gym profile, branding, branch settings |
| `/api/members` | Gym Admin / Staff / Member | Member registration, profile lookups, bulk CSV import |
| `/api/memberships` | Gym Admin / Member | Member package enrollments, renewal execution |
| `/api/fees` | Gym Admin / Member | Fee ledger management, receipt PDF downloads |
| `/api/attendance` | Gym Admin / Staff / Member | Check-in registration and visit history |
| `/api/workouts` | Gym Admin / Trainer / Member | Workout slip creation and PDF export |
| `/api/bookings` | Trainer / Member | Personal training session scheduling |
| `/api/classes` | Gym Admin / Trainer / Member | Group fitness classes and attendance |
| `/api/internal/cron` | Bearer `CRON_SECRET` | Scheduled background automation |

### Mobile Token Contract (`X-Client: mobile`)
Because mobile applications cannot reliably use browser cookie jars, VajraFitness supports an explicit mobile token contract:
- The mobile client sends the HTTP header: `X-Client: mobile`.
- **`POST /api/auth/login` & Register**: Instead of setting an `httpOnly` cookie, returns the refresh token directly in the JSON response:
  ```json
  {
    "message": "Logged in successfully",
    "token": "<15-minute JWT>",
    "refreshToken": "<96-character hex token>",
    "user": { "id": "uuid", "username": "Rohan", "email": "rohan@example.com", "role": "MEMBER" }
  }
  ```
- **`POST /api/auth/refresh`**: Accepts `{ "refreshToken": "..." }` in the request body. Rotates the refresh token and returns a fresh pair `{ token, refreshToken }`.
- **Token Reuse Detection**: If an invalidated refresh token is presented, the entire session family is revoked immediately to mitigate session hijacking.
- **`POST /api/auth/logout`**: Revokes the refresh token passed in the request body.

### Trainer Signup & Approval Lifecycle
1. **Public Signup**: `POST /api/auth/register/trainer` allows trainers to self-register for an approved gym.
2. **Pending Gate**: Accounts start with `trainerStatus: "PENDING"`.
3. **Protected Account Access**: Pending or rejected trainers can access only account management endpoints (`/auth/me`, `/auth/profile`, `/auth/logout`). All other endpoints return HTTP 403 `TRAINER_PENDING` or `TRAINER_REJECTED`.
4. **Gym Admin Approval**: The gym owner reviews applications via `/api/staff/trainer-applications/:id` and approves or rejects them.

### Public Directory & SEO Endpoints
- `GET /api/gym`: Lists approved gyms for the public marketplace.
- `GET /api/public/gyms/:gymId`: Fetches publicly visible gym details and available membership plans.
- `GET /api/public/sitemap.xml`: Dynamically generated XML sitemap incorporating static routes, SEO calculators, and public gym URLs.

---

## 5. Mobile Application (`mobile/`)

### Stack & Structure
The mobile client is built with **Expo SDK 58** and **React Native**, using **Expo Router**:
- Stored in `mobile/` with isolated dependencies and configuration.
- Styled using a dedicated design tokens theme (`src/theme.ts`) aligning with the web burgundy and slate aesthetic.
- Server communication managed through **TanStack Query** with automated single-flight token refresh.

### Authentication & OS Keychain Integration
- Refresh tokens are securely stored using `expo-secure-store` (backed by iOS Keychain and Android Keystore).
- Short-lived JWT access tokens reside solely in memory.
- `src/api/client.ts` intercepts 401 errors, performs atomic refresh calls, and replays failed queries seamlessly.

### Role-Based Mobile Navigation
Upon launch, `app/index.tsx` inspects `user.role` and routes the user into specific tab layouts:
- **Member**: Home, Workout Slips, Attendance History, Fee Receipts, Profile.
- **Trainer**: Daily Schedule, Assigned Members, PT Bookings, Profile.
- **Gym Admin & Staff**: Front-desk check-in scanner, member lookup, active attendances.
- **Super Admin**: Redirected to the comprehensive desktop web console.

---

## 6. Security Policy & Threat Mitigation

### Threat Model & Security Controls

| Threat Vector | Defense Architecture |
|---|---|
| **Credential Stuffing & Brute Force** | Argon2 password hashing; progressive login lockouts tracked in Redis; tight rate limiting on `/auth` routes. |
| **Token Theft & Replay** | 15-minute access token lifespan in memory; 7-day refresh tokens rotated upon every invocation; reuse detection destroys session family. |
| **Cross-Tenant Data Tampering** | Tenant ID resolved on server via authentication context; parameterized queries through Prisma; automated cross-tenant security test suites. |
| **Cross-Site Scripting (XSS)** | React automatic string escaping; strict API CSP; no usage of unescaped HTML injection. |
| **Cross-Site Request Forgery (CSRF)** | Web refresh token uses `httpOnly`, `SameSite=Strict` cookies; origin and referer header validation on refresh requests. |
| **SQL Injection** | Prisma ORM uses parameterized queries exclusively. |
| **Financial / Payment Tampering** | Order prices derived on the server from the fee records; Razorpay webhook signatures verified via HMAC-SHA256 using raw request payloads. |
| **Secret Exposure** | `.env*` files git-ignored; secret scanning (gitleaks) integrated into CI; separate direct vs pooled database URLs. |

### Authentication & Session Defense
- **Token Versioning**: `tokenVersion` on the `User` model is encoded in JWT claims. Password changes, account freezes, or administrative resets increment this integer, instantly invalidating all active access tokens.
- **Branded Portal Security**: Custom domain mapping enforces SSL and tenant verification to prevent domain spoofing.

### Reporting Vulnerabilities
Security vulnerabilities should be reported privately:
- Via **GitHub Security Advisories** on the repository ("Report a vulnerability").
- Maintainers review and patch reports prior to public disclosure.

---

## 7. Deployment, Infrastructure & DevOps

### Infrastructure Blueprint
- **Hosting**: Vercel (Production branch `main`, Preview branches for pull requests).
- **Database**: PostgreSQL on **Neon**:
  - `DATABASE_URL`: **Pooled connection string** (PgBouncer) for serverless API runtime.
  - `DIRECT_URL`: **Direct unpooled connection** for Prisma migrations, backups, and CLI operations.
- **Cache & Rate Limiting**: Upstash Redis (configured via `REDIS_URL`).
- **Payment Gateway**: Razorpay (Webhooks directed to `https://<domain>/api/payments/webhook`).

### Environment Configuration

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon pooled PostgreSQL connection string |
| `DIRECT_URL` | Yes (Migrations) | Neon direct connection string (no pooler) |
| `JWT_SECRET` | Yes | Cryptographic secret for signing JWTs (>= 32 chars) |
| `NODE_ENV` | Yes | Set to `production` in staging and production |
| `FRONTEND_URL` | Yes | Canonical public URL of the web platform |
| `TRUST_PROXY` | Yes | Set to `1` behind Vercel reverse proxy |
| `REDIS_URL` | Recommended | Upstash Redis connection string for distributed caching |
| `RAZORPAY_KEY_ID` | Optional | Razorpay public key ID |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay private API secret |
| `RAZORPAY_WEBHOOK_SECRET`| Optional | Secret for verifying incoming Razorpay webhooks |
| `CRON_SECRET` | Yes (Automation)| Secret bearer token required for `/api/internal/cron` |
| `SMTP_*` | Optional | SMTP mail credentials for activation & password emails |

### Database Migrations Workflow
Prisma schema migrations are located in `backend/prisma/migrations/`.
1. **Never apply migrations automatically on Vercel deployment.**
2. When creating schema changes, generate migrations locally:
   ```bash
   cd backend
   npx prisma migrate dev --name <migration_name>
   ```
3. Apply migrations to the production/staging Neon database using the **direct connection string**:
   ```bash
   cd backend
   DATABASE_URL="<neon_direct_url>" npm run db:migrate
   ```
4. Migrations must be strictly **additive** (nullable columns, new tables) to maintain backward compatibility during code deployments.

### Scheduled Background Jobs & Automation
Automated platform operations are consolidated in `backend/src/jobs/scheduler.ts`:
- Expiring elapsed memberships.
- Dispatching pre-expiry membership notifications.
- Sending fee due reminders.
- Reconciling pending Razorpay payment orders.
- Executing subscription grace-period transitions and dunning.

**Triggering Execution**:
- On long-running Node/Docker servers: Runs automatically at boot and hourly.
- On Vercel: Invoked via Vercel Cron or an external monitor calling `POST /api/internal/cron` with header `Authorization: Bearer <CRON_SECRET>`.

### Automated Backups & Disaster Recovery
- Nightly backups run via `.github/workflows/backup.yml` using `pg_dump`.
- Dumps are GPG-encrypted before upload to prevent data exposure.
- Backups can optionally be replicated to an AWS S3 bucket (`AWS_S3_BACKUP_BUCKET`).
- Test restoration verification:
  ```bash
  gunzip -c backup.sql.gz | psql "$SCRATCH_DATABASE_URL"
  ```

### CI/CD Workflows & Verification
The repository maintains automated GitHub Actions workflows:
- **`deploy.yml` (`quality`)**: Runs on pushes/PRs. Executes Prisma validation, TypeScript compiler (`tsc --noEmit`), backend test suite against PostgreSQL 16 container, frontend linter (`oxlint`), and Vite production build.
- **`security.yml`**: Runs GitHub CodeQL analysis, dependency vulnerability scans, and gitleaks secret detection.
- **`e2e-audit.yml`**: Runs Playwright end-to-end tests and accessibility audits (`axe`).

---

## 8. Brand Identity & Design System

### Brand Concept & Symbolism
**"Vajra" (वज्र)** is the ancient Sanskrit symbol of the thunderbolt and indestructible diamond. It embodies unbreakable strength, power, focus, and precision.

### Color Palette & Tokens
Tailwind CSS v4 `@theme` tokens defined in `frontend/src/index.css`:

| Token Name | Hex Code | Meaning / Usage |
|---|---|---|
| **Primary Accent** | `#800020` / `#9F1239` | Burgundy Crimson: grit, prestige, energy |
| **Secondary Accent** | `#FFB300` / `#F59E0B` | Electric Amber Gold: lightning, speed, premium highlights |
| **Surface Dark** | `#0D0E10` / `#141618` | Deep Obsidian / Slate: modern dark-mode focus |
| **Surface Light** | `#F8FAFC` / `#FFFFFF` | Crisp Off-White: high readability, light-mode background |
| **Text Ink** | `#0F172A` / `#F1F5F9` | Neutral slate for optimal WCAG AA contrast |

### Typography & Visual Elements
- **Display Font**: **Outfit** (clean geometric sans-serif for headings and branding).
- **Body Font**: **Inter** / system sans-serif for UI data density and readability.
- **Border Radii**: 14px for cards and dialogs, 10px for buttons and interactive controls.
- **Elevation**: Subtle layered shadows (`shadow-sm`, `shadow-md`) avoiding harsh outlines.

### Official Brand Assets
Vector assets are stored in `frontend/public/`:
- `logo.svg`: Primary brand icon mark.
- `logo-horizontal.svg`: Sublogo for invoices, letterheads, and headers.
- `favicon.svg`: Browser tab icon and PWA mark.
- `branding-badge.svg`: Circular seal for certificates and workout slips.
- `branding-emblem.jpg`: High-resolution 3D emblem for social cards and splash screens.

---

## 9. Contributor Guide & Engineering Standards

### Branching Strategy
- **`main`**: Production release branch. Deployed directly to Vercel. Only stable, fully tested releases are merged here.
- **`staging`**: Integration and active development branch.
- **Feature Branches**: Cut from `staging` (`feature/<feature-name>`), submitted via Pull Requests back into `staging`.

### Local Development Setup
Prerequisites: Node.js 22 LTS, Docker or local PostgreSQL.

```bash
# 1. Clone repository
git clone https://github.com/Himanshusingh204/vajra-fitness-gym-management.git
cd vajra-fitness-gym-management

# 2. Install monorepo dependencies
npm install --legacy-peer-deps

# 3. Spin up local database (Docker or local Postgres)
node scripts/dev-db.mjs

# 4. Backend setup
cd backend
cp .env.example .env
# Set DATABASE_URL to local postgres (e.g. postgresql://vajra_admin:vajra_secure_pass@localhost:5432/vajra_fitness_dev)
npx prisma db push
npm run seed        # Seeds demo users, gyms, plans
npm run dev         # Runs on http://localhost:5000

# 5. Frontend setup (new terminal)
cd ../frontend
cp .env.example .env
npm run dev         # Runs on http://localhost:5173
```

### Pre-Flight Verification & Quality Gates
Before opening a pull request or pushing to `staging`, execute the following checks locally:

```bash
# Backend verification
cd backend
npx prisma validate
npx tsc --noEmit
npm test

# Frontend verification
cd ../frontend
npx tsc -b
npm run lint
npm run build
```

---
*For historical plans, audit logs, and legacy roadmaps, refer to `docs/archive/`.*
