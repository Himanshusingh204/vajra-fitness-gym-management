# VajraFitness — System Architecture

## Overview

VajraFitness is a multi-tenant Gym Management SaaS platform built on React 19 / Vite (frontend) and Node.js / Express 5 / TypeScript (backend) with PostgreSQL and Prisma.

## Tenant Isolation Model

Every gym (`Gym`) is an independent tenant. All operational data (members, staff, trainers, payments, attendance, inventory, expenses, equipment, classes, bookings) belongs to a single `gymId`. The backend enforces isolation through:

- Middleware checks (`auth.middleware`, `subscription.middleware`)
- Controller-level ownership verification (`gymId` in params/body verified against user's gym)
- Prisma queries scoped by `gymId`
- Feature entitlement checks (`entitlements.service.ts`)
- Subscription access control (`subscription.middleware.ts`)

No gym can access another gym's data through any API endpoint. IDOR is blocked server-side.

## Key Layers

```
Frontend (React + Vite)
  └── API Client (Axios) → Backend (Express + TypeScript)
        ├── Middleware (Auth, Rate Limit, Subscription, Tenant Isolation)
        ├── Controllers (Business entry points)
        ├── Services (Business logic: subscriptions, payments, entitlements)
        ├── Prisma ORM → PostgreSQL
        └── Background Jobs (Scheduler: expiry, reminders)
```

## Authentication

- JWT access token (15 min, memory-only in browser)
- HTTP-only refresh cookie (7 days, rotated, hashed in DB, reuse detection)
- Argon2 password hashing (bcrypt migration supported)
- Per-email brute-force lockout
- Rate limiting on all sensitive endpoints

## Multi-Tenancy Enforcement

Every protected route verifies:

1. Authenticated?
2. User active?
3. Gym exists?
4. Gym approved?
5. Subscription valid?
6. Feature entitlement valid?
7. Resource limit valid?
8. Allow request

## Subscription Lifecycle

States: `TRIAL` → `PENDING_PAYMENT` → `ACTIVE` → `PAST_DUE` → `GRACE_PERIOD` → `EXPIRED` → `SUSPENDED` / `CANCELLED`

Access rules:
- `ACTIVE`, `TRIAL`, `PAST_DUE`, `GRACE_PERIOD`: Full access
- `EXPIRED`: Read-only (view subscription, billing, renew)
- `SUSPENDED`, `CANCELLED`: Blocked (403)

Feature gating uses `entitlements.service.ts` with centralized feature codes (`FEATURE_CODES`).
