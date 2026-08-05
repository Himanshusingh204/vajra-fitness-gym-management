# Vajra Fitness - Enterprise Gym Management System

Vajra Fitness is a premium, production-ready SaaS application designed for gym owners in India. It provides a complete solution for managing multiple gyms, staff, trainers, and members with role-based access control and a modern, high-performance user interface.

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

- **SaaS Plans & Gym Subscriptions**: Super Admins create monthly/yearly Vajra plans (member/trainer/staff limits, advanced reports) and assign them to gyms; gym owners see their subscription.
- **Reports**: Revenue report (JSON/CSV) and per-gym stats endpoints for gym admins.

## Demo / Default Credentials

These credentials are for **local development only** and must never be exposed on the public website, UI, or production builds.

| Role                              | Email / Username         | Password    | Source                                                            |
| --------------------------------- | ------------------------ | ----------- | ----------------------------------------------------------------- |
| Super Admin                       | `admin@vajrafitness.com` | `admin123`  | `backend/scripts/seedSuperAdmin.ts`                               |
| Gym Admin (Iron Valley Gym)       | `owner@ironvalley.com`   | `gym123`    | `backend/scripts/seedGyms.ts`                                     |
| Gym Admin (PowerHouse Fitness)    | `owner@powerhouse.com`   | `gym123`    | `backend/scripts/seedGyms.ts`                                     |
| Gym Admin (Peak Performance Club) | `owner@peakclub.com`     | `gym123`    | `backend/scripts/seedGyms.ts`                                     |
| Member                            | (any created member)     | *(activation link)* | Gym admins generate a one-time activation link per member; the member sets their own password at `POST /auth/activate`. No default passwords are used. |

- The Super Admin is created by running `npx tsx scripts/seedSuperAdmin.ts` inside `backend/`.
- Approved demo gyms (with membership plans) are seeded by running `npx tsx scripts/seedGyms.ts` inside `backend/`.
- There are **no default member/staff passwords**. When a member or staff account is created, the API returns an `activationLink` (built from `FRONTEND_URL`) that the user opens to set their password. Forgot-password reset works the same way via `POST /auth/forgot-password` → `POST /auth/reset-password`.
- `backend/check-users.ts` and `backend/test-login.js` also reference the same Super Admin account for local debugging.
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
- Prisma (ORM, SQLite for local dev)
- JWT (Authentication) + HTTP-only refresh-token cookie
- argon2 + bcrypt (Password Hashing)
- Helmet & CORS (Security)
- pdfkit (Fee receipts & workout slips as PDF)

## Folder Structure

```
vajra-fitness/
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
SMTP_FROM="Vajra Fitness <no-reply@vajrafitness.in>"
```

- The database is **PostgreSQL** (SQLite is not used). For local development run `docker compose up -d db` (see `docker-compose.yml`) or point `DATABASE_URL` at any Postgres instance.
- `JWT_SECRET` is enforced at startup to be at least 32 chars.
- `TRUST_PROXY` should be set to `1` (or the number of proxy hops) when deployed behind nginx / Cloud Run / a load balancer so rate limiting keys on real client IPs.
- SMTP is optional in development (links are logged to the console); **required in production** so activation and password-reset emails are delivered.

**Frontend (`frontend/.env`)**

```env
VITE_API_URL="http://localhost:5000/api"
```

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
- `POST /auth/logout` — clears the refresh cookie.
- `GET /auth/me` — current user profile (gym, plan, status, notifications).
- `POST /auth/change-password` — authenticated password change (verifies the current password).

All protected routes expect `Authorization: Bearer <token>`. The access token lives 15 minutes; the refresh cookie 7 days.

### Roles & access

`SUPER_ADMIN` manages the whole platform; `GYM_ADMIN` owns one or more gyms; `TRAINER` and `STAFF` belong to a single gym; `MEMBER` belongs to one gym. Endpoints that take a `:gymId` verify that the gym owner is the caller (Super Admin bypasses). Member self-service routes verify the caller is the member, their gym owner, or a Super Admin.

### Public (no auth)

- `GET /gyms` — approved gyms with their active plans.
- `GET /plans` — active membership plans only.
- `POST /enquiries/gym/:gymId` — walk-in/online enquiry (public lead).
- `POST /enquiries/contact` — contact-page form.
- `GET /public/faqs`, `GET /public/testimonials` — CMS content.

### Gym Admin dashboard

- `GET|PUT /gym/my-branch` — the owner's gym profile.
- `GET /gym/:gymId/stats` — members/active/pending, revenue (total + this month), pending fees, check-ins today, trainers/staff/plans/notices.
- `GET /plans/admin/gym/:gymId` · `POST /plans` · `PUT /plans/:id` · `DELETE /plans/:id`
- `GET /members/gym/:gymId` · `POST /members/gym/:gymId` · `GET /members/:id` · `PUT /members/:id` (approve/activate) · `POST /members/:id/activation-link` (regenerate link)
- `GET /fees/gym/:gymId` · `POST /fees/gym/:gymId` · `PUT /fees/:id` (status) · `GET /fees/member/:memberId`
- `GET /fees/:id/receipt` — fee receipt PDF (member self, owner, or Super Admin).
- `GET /attendance/gym/:gymId` · `POST /attendance/gym/:gymId` (member check-in; validates gym membership).
- `GET /workouts/gym/:gymId` — all slips for a gym.
- `POST /workouts/member/:memberId` — assign a slip (admin or the gym's trainer).
- `GET /workouts/:id/pdf` — workout-slip PDF (authorized: self / trainer / owner / Super Admin).
- `GET|POST /staff/gym/:gymId` · `DELETE /staff/:id` — manage trainers/staff (activation link returned on create).
- `GET /enquiries/gym/:gymId` · `PUT /enquiries/:id` — leads.
- Memberships: `GET /memberships/gym/:gymId` · `POST /memberships/gym/:gymId` (create) · `POST /memberships/gym/:gymId/renew` · `GET /memberships/:id`. Auto-expiry of overdue memberships is handled by the `syncExpiredMemberships` job.
- Bookings: `GET /bookings/gym/:gymId` (manage all) · `PATCH /bookings/:id` (role-aware status update).
- Notifications: `GET /notifications/my` · `PATCH /notifications/read-all` · `PATCH /notifications/:id/read` · `DELETE /notifications/:id`.

### Member self-service

- `GET /members/my-profile` — own profile (gym + plan + status).
- `GET /workouts/member/:memberId` · `GET /fees/member/:memberId` — own slips/payments only (403 for cross-member access).
- `GET /memberships/my` — own memberships; `POST /bookings` — book a trainer; `GET /bookings/my` — own bookings.
- `GET /attendance/my` — own check-in history; `GET /notifications/my` — own notifications.

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

The repo ships a `docker-compose.yml` with PostgreSQL, Redis, and a hardened multi-stage backend image (non-root user, production-only dependencies, healthcheck, and automatic `prisma db push` on first boot).

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
- [ ] Switch from `prisma db push` to `prisma migrate deploy` for reproducible production schema changes.
- [ ] Monitoring/alerting on `/api/health` and error logs; log rotation on the runtime.
- [ ] For multi-instance scale-out, move the login brute-force lockout and rate-limit state to Redis (currently in-memory, single-instance).
- [ ] Keep the access token in memory in the browser (refresh token is already an httpOnly cookie); rotate the access token after any XSS concern.

### Auth & Security notes

- Passwords are hashed with **argon2** (legacy bcrypt `$2` hashes are auto-migrated on login).
- **Refresh tokens are stored hashed (SHA-256) in PostgreSQL, rotated on every refresh, and reuse of an old token revokes the entire session family.** Logout and password change revoke outstanding tokens immediately.
- Login brute-force protection: per-IP rate limiting + per-email lockout after 5 failures.
- All API routes use Zod validation; no raw SQL is used (Prisma parameterizes all queries).
- Super Admin routes are fully isolated behind a `SUPER_ADMIN`-only guard; gym-scoped and member-scoped routes verify ownership (no IDOR).

## License

Proprietary / Commercial Use Only.

## DO NOT CHANGE TEXT BELOW

Prompt: Improve and Polish the Existing Website UI/UX

You are an expert UI/UX designer and senior frontend developer.

Redesign and refine the existing website without changing its core functionality. The current design feels incomplete, has inconsistent spacing, poor text visibility, weak color contrast, and several unfinished sections.

Design Improvements
Fix the overall layout and improve visual hierarchy.
Improve spacing, alignment, and consistency across all pages.
Ensure every section looks complete and professionally designed.
Improve typography, font sizes, line heights, and readability.
Fix all text visibility and color contrast issues.
Create a modern, premium, and polished appearance.
Use a consistent color palette throughout the website.
Improve responsive behavior for mobile, tablet, and desktop.
Glassmorphism
Create a premium glassmorphism navbar.
Add backdrop blur, subtle transparency, soft borders, and elegant shadows.
Make the navbar sticky with a smooth transition on scroll.
Ensure glass effects remain readable in both light and dark backgrounds.
UI Enhancements
Improve buttons with hover, active, and focus states.
Enhance cards with subtle depth and hover animations.
Add beautiful section dividers and backgrounds.
Improve forms, inputs, and dropdown styling.
Add consistent border radius and shadow system.
Use modern gradients where appropriate.
Improve icons and visual consistency.
Complete Unfinished Sections

If any page or section looks empty or unfinished:

Add meaningful content blocks.
Add feature cards.
Add statistics/counters.
Add testimonials.
Add FAQ sections.
Add CTA sections.
Add timeline/process sections where appropriate.
Improve footer with useful links and better layout.
Animations

Add smooth and professional animations throughout the website.

Include:

Smooth page transitions.
Beautiful loading animation.
Skeleton loaders where appropriate.
Fade-in on scroll.
Slide-up animations.
Staggered card animations.
Image reveal animations.
Hover micro-interactions.
Floating decorative elements.
Smooth button interactions.
Counter animations.
Progress animations.
Parallax effects (subtle only).
Text reveal animations.
Section entrance animations.
Smooth modal animations.
Smooth accordion animations.
Navbar hide/show on scroll.
Smooth scrolling behavior.

Use animation libraries like Framer Motion, GSAP, or AOS only if they improve performance and maintainability.

Performance
Keep animations smooth (60 FPS).
Optimize rendering.
Prevent layout shifts.
Reduce unnecessary re-renders.
Lazy-load images and heavy components.
Optimize animation triggers.
Respect the user's "prefers-reduced-motion" setting.
Maintain excellent Lighthouse scores.
Responsiveness

Ensure every section is fully responsive:

Mobile
Tablet
Laptop
Large Desktop

No overflowing content.
No broken layouts.
Consistent spacing across all screen sizes.

Accessibility
Maintain WCAG-compliant color contrast.
Visible keyboard focus states.
Semantic HTML.
Proper ARIA labels where needed.
Readable typography.
Final Goal

Transform the website into a premium, production-ready product with a clean, modern, elegant, and highly polished UI/UX. Every page should feel complete, visually balanced, and interactive while maintaining excellent performance, accessibility, and responsiveness. Do not remove existing functionality—only improve the design, layout, animations, and overall user experience.

[x] Recover auto-login after registration (auth flow)
[x] Backend: Booking/PT model + endpoints + auto-approve member registration
[x] Frontend: functional BookPT feature (list, form, history, dup prevention)
[x] Frontend: modern Member dashboard with sections + sidebar
[x] Frontend: functional TrainerDashboard
[x] Frontend: HomePage + theme + CSS fixes from audit
[x] Frontend: build + lint + audit; update README + AGENTS summar
