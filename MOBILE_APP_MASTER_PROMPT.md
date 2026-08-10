# Master Prompt — Build the VajraFitness Mobile App

> **How to use this file:** copy the entire prompt below (from `## PROMPT` to the end) and paste
> it into your AI coding assistant (Cursor / Claude Code / Copilot / v0 / etc.). It is self-contained:
> it describes the existing backend API, the web screens to replicate, the auth/session model,
> roles, and the exact behaviors to build. Adjust the bracketed `{…}` choices, then let the AI
> scaffold the app. This file is the single source of truth for the build request.

---

## PROMPT

You are building a **cross-platform mobile app** for **VajraFitness**, an existing SaaS gym
management system. The web frontend (`React 19 + Vite + TypeScript`) and backend
(`Node.js + Express 5 + Prisma + PostgreSQL`) are already deployed. **You must NOT rebuild the
backend** — reuse the existing REST API exactly. Your job is the mobile client only.

### 1. Non-negotiable requirements

- **Framework:** React Native (Expo SDK 54+) with TypeScript. Expo Router for navigation.
- **Reuse the live API as-is.** Do not invent new endpoints, rename fields, or change payload shapes.
- **Bottom tab navigation** for member/trainer/staff apps (Home, Workouts, Bookings, Fees, Profile).
- **Sidebar/drawer** for the gym-admin and super-admin apps.
- **Offline-safe reads:** cache API responses (React Query + AsyncStorage) so dashboards render from cache when offline; show a stale-data banner.
- **Push notifications:** Firebase Cloud Messaging (Expo Notifications) wired to the in-app notification center.
- **Deep links:** `https://{FRONTEND_URL}/activate?token=…`, `/reset-password?token=…`, `/gyms/:id` must open in-app.
- **Secure storage:** access token in memory (never disk); refresh token handled by the httpOnly cookie (see auth model). Only non-sensitive prefs in AsyncStorage.
- **Accessibility:** WCAG 2.1 AA on all interactive elements; every icon has a label; font scaling respected.
- **Theming:** support light/dark toggles mirroring the web theme; use the existing brand palette and `Inter`-family type scale.

### 2. Backend API contract (authoritative)

- **Base URL:** `{VITE_API_URL}` — e.g. `https://vajra-fitness-api.onrender.com/api`
- **Auth:** access token lives in memory, sent as `Authorization: Bearer <token>`. Refresh token is an
  **httpOnly cookie**; call `POST /auth/refresh` with `withCredentials: true` to rotate it. Implement the
  exact 401 → single-flight refresh → retry flow from `frontend/src/services/api.ts` (concurrent callers
  share one in-flight refresh; a reused refresh token revokes the session family).
- **Money:** all amounts are numbers (backend serializes Prisma `Decimal` to JSON numbers). Render with
  ₹ formatting. **Never** multiply/round float money; treat amounts as integer paise where possible.
- **Roles:** `SUPER_ADMIN`, `GYM_ADMIN`, `TRAINER`, `STAFF`, `MEMBER`. A gym owner owns 1+ gyms; the
  super admin manages the whole platform; trainer/staff/member belong to one gym.
- **PDFs** (fee receipts, workout slips, payslips) stream as `application/pdf` with
  `Content-Disposition: attachment` — download and open with the OS PDF viewer.

### 3. Screens to replicate (from the web app)

#### Public (no login)
| Screen | Route | Key content |
| ------ | ----- | ----------- |
| Home | `/` | Hero, gym directory preview, membership CTA, testimonials, FAQ teaser |
| Gyms | `/gyms` | Public approved gyms with active plans (`GET /gym`) |
| Gym detail | `/gyms/:id` | Gym info, facilities, plans, contact/enquiry form (`POST /enquiries/gym/:id`) |
| Membership | `/membership` | Plans & pricing, join CTA |
| Subscription | `/subscription` | SaaS plans for gym owners |
| Contact / Help / FAQ / Terms / Privacy / Refund / Cookies | `/contact`, `/help`, `/faq`, `/terms`, `/privacy`, `/refund`, `/cookies` | Static content; contact form → `POST /enquiries/contact` |

#### Auth
| Screen | Route | Behavior |
| ------ | ----- | -------- |
| Login | `/login` | `POST /auth/login` → store token in memory; sets httpOnly refresh cookie |
| Forgot password | `/forgot-password` | `POST /auth/forgot-password` |
| Reset password | `/reset-password?token=…` | `POST /auth/reset-password` |
| Activate account | `/activate?token=…` | `POST /auth/activate` — set own password from one-time link |
| Register gym owner | `/register` | `POST /auth/register/vendor` |
| Register member | `/register/member` | `POST /auth/register/member` with `{ gymId, planId? }` |

#### Member / Trainer / Staff (bottom tabs)
| Tab → screen | Web source | Key calls |
| ------------ | ---------- | --------- |
| Home / Dashboard | `MemberDashboard.tsx` | `GET /auth/me`, `GET /memberships/my`, `GET /attendance/my`, membership expiry status (ACTIVE / EXPIRING_SOON / EXPIRED) |
| Workouts | — | `GET /workouts/member/:id` (my slips), nutrition plans, progress logs (`GET/POST /progress`, `GET/POST /nutrition`) |
| Bookings | `booking.api.ts` | `GET /bookings/my`, `POST /bookings` (book trainer), `PATCH /bookings/:id` (cancel) |
| Classes | `class.api.ts` | `GET /classes`, `POST /classes/:id/book`, `DELETE /classes/:id/booking` |
| Fees | `fee.api.ts` | `GET /fees/member/:id`, `GET /fees/:id/receipt` (PDF), `POST /payments/checkout` → Razorpay → `POST /payments/verify` |
| Notices | `notice.api.ts` | `GET /notices/my` |
| Notifications | `notification.api.ts` | `GET /notifications`, mark read / read-all / delete; bell + unread badge |
| Profile | `auth.api.ts` | `PUT /auth/password`, `GET /auth/me`, `POST /auth/logout` |

**Role split on the shared dashboard:** `TRAINER` sees a trainer dashboard (workout slips they
assigned, PT bookings, members), `STAFF` sees the staff dashboard (attendance + members), `MEMBER`
sees the member dashboard above. Mirror `DashboardRouter` in `App.tsx` (TRAINER → TrainerDashboard,
STAFF → StaffDashboard, else MemberDashboard).

#### Gym Admin (drawer app)
| Screen | Web source | Key calls |
| ------ | ---------- | --------- |
| Dashboard | `GymAdminDashboard.tsx` | `GET /gym/:gymId/stats` (members, revenue, pending fees, check-ins today) |
| Members | `member.api.ts` | `GET /members/gym/:gymId`, `POST /members/gym/:gymId`, approve/activate, regenerate activation link |
| Membership plans | `membershipPlan.api.ts` | `GET/POST/PUT/DELETE /plans/admin/gym/:gymId` |
| Memberships | `membership.api.ts` | `GET/POST /memberships/gym/:gymId`, `POST …/renew` |
| Fees | `fee.api.ts` | `GET /fees/gym/:gymId`, `POST /fees/gym/:gymId` (record offline payment CASH/UPI/CARD/BANK_TRANSFER/OTHER), `PUT /fees/:id`, receipt PDF |
| Attendance | — | `GET/POST /attendance/gym/:gymId` (manual check-in) |
| Workouts | `workout.api.ts` | `GET /workouts/gym/:gymId`, `POST /workouts/member/:memberId`, PDF |
| Staff & Trainers | `staff.api.ts` | `GET/POST /staff/gym/:gymId`, `DELETE /staff/:id` (activation link on create) |
| Enquiries / leads | `enquiry.api.ts` | `GET /enquiries/gym/:gymId`, `PUT /enquiries/:id` |
| Bookings | `booking.api.ts` | `GET /bookings/gym/:gymId`, `PATCH /bookings/:id` |
| Notices | `notice.api.ts` | CRUD on `/notices/gym/:gymId` |
| Reports | `reports.api.ts` | `GET /reports/gym/:gymId/stats`, revenue CSV |
| Gym profile | `gym.api.ts` | `GET/PUT /gym/my-branch` |
| SaaS subscription | `saas.api.ts` | `GET /saas/my-subscription` |
| Expenses / Inventory / Equipment / Classes / Payslips / Referrals | `expense.api.ts`, `inventory.api.ts`, `equipment.api.ts`, `class.api.ts`, `payslip.api.ts`, `referral.api.ts` | CRUD per module |

#### Super Admin (drawer app)
| Screen | Key calls |
| ------ | --------- |
| Analytics | `GET /admin/analytics` |
| Gyms | `GET /admin/gyms`, `PUT /admin/gyms/:id/approve|suspend` |
| Users | `GET /admin/users`, `PUT /admin/users/:id/status` |
| CMS FAQs/testimonials | `GET/POST/PUT/DELETE /admin/cms/faqs` and `/admin/cms/testimonials` |
| Support tickets | `GET /admin/support/tickets`, `PUT /admin/support/tickets/:id` |
| Audit logs | `GET /admin/audit-logs` |
| SaaS plans | `GET/POST/PUT/DELETE /saas/plans` |
| SaaS subscriptions | `GET/POST /saas/subscriptions`, `PATCH /saas/subscriptions/:id` |

### 4. Auth & session model (must match web exactly)

1. `POST /auth/login` → response has `{ token, user }` + a `Set-Cookie: refreshToken` (httpOnly, `Secure`, `SameSite=Lax`).
2. Store `token` in **memory only** (a module-level variable / in-memory store). Restore the session on app launch by calling `GET /auth/me` (the cookie is sent automatically if stored; on web this is a cookie jar, on native use a transparent cookie manager such as `expo-cookie-manager` or mirror the bearer-token approach).
3. On any 401 from an API call → call `POST /auth/refresh` **once** (single-flight; concurrent callers await the same promise) → retry the original request. If refresh fails → force logout.
4. `POST /auth/logout` clears the cookie/session server-side.
5. **Activation links:** no default passwords. A gym admin creates the member/staff account and gets a one-time `activationLink` to share; the user sets their own password at `/activate`. Support deep-linking this flow.

### 5. Payments (Razorpay)

- `GET /payments/config` → `{ enabled, keyId }`. If disabled, hide "Pay Online" and show "contact the front desk".
- Flow: `POST /payments/checkout` `{ feeId }` → Razorpay order → open Razorpay checkout with `keyId` → on success `POST /payments/verify` `{ orderId, paymentId, signature }` (backend settles server-side; the client must **never** mark a fee paid itself).
- Handle the case where the member closes the checkout — the backend webhook still settles it; poll `GET /fees/member/:id` and refresh.

### 6. Project structure (target)

```
mobile/
  app/                    # Expo Router file-based routes
    (auth)/               # login, forgot/reset, activate, register
    (public)/             # home, gyms, static pages
    (member)/             # bottom tabs for member/trainer/staff
    (gym-admin)/          # drawer
    (super-admin)/        # drawer
  src/
    api/                  # typed API clients mirroring frontend/src/api/*.api.ts
    hooks/                # useQuery wrappers per resource
    store/                # auth store (token in memory), theme store
    components/           # shared UI (buttons, cards, charts, EmptyState, banner)
    services/apiClient.ts # axios instance: baseURL, bearer injection, 401 refresh, downloadFile
    utils/                # money formatting (₹, integer paise), date/UTC formatting
    theme/                # light/dark tokens + brand palette
  app.json / eas.json
```

### 7. Money & date conventions

- Backend stores money as `Decimal(10,2)` and serializes as JSON **numbers** (`1500`, not `"1500"`).
- Format with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- All timestamps are **UTC ISO-8601**; display in the user's local timezone; store/echo UTC.

### 8. Quality gates (do these before finishing)

- [ ] Every screen maps to a real endpoint from the API contract above — no invented fields.
- [ ] Auth flow: login → refresh-on-401 → logout; reused refresh token → server revokes family → app logs out.
- [ ] Offline: cached dashboards render with a stale-data banner; mutations show a clear failure state.
- [ ] Deep links: `/activate`, `/reset-password`, `/gyms/:id` open the right screen.
- [ ] Push notifications received and tapping them opens the notification center.
- [ ] Accessibility: VoiceOver/TalkBack passes on the 3 most-used flows; hit targets ≥ 44×44 px.
- [ ] `npx expo-doctor` clean; TypeScript strict passes; no `any` leaks.
- [ ] Builds: `eas build --platform all` (or at least one Android + one iOS) succeed.

### 9. Deliverables

1. The full Expo/React Native codebase in `mobile/`.
2. A short `mobile/README.md` — how to run, env vars (`EXPO_PUBLIC_API_URL`), and how auth/refresh/offline work.
3. A checklist mapping each web route to its mobile screen + endpoint.
4. Notes on anything you had to change on the **backend** to support mobile — **get explicit sign-off before touching the API**; prefer client-side solutions (cookies vs bearer, etc.).

---

## PROMPT (end)

---

## Reference quick-links

| Web source | Purpose |
| ---------- | ------- |
| `frontend/src/services/api.ts` | Base URL, bearer injection, 401 → single-flight refresh retry, `downloadFile` |
| `frontend/src/store/useAuthStore.ts` | In-memory token, `bootstrap()` restore, user/role |
| `frontend/src/App.tsx` | Route map + role gating (`ProtectedRoute`, `DashboardRouter`) |
| `frontend/src/pages/*Dashboard.tsx` | Per-role dashboard layouts & sections |
| `frontend/src/api/*.api.ts` | Typed request/response shapes per resource |
| `backend/src/routes/*.routes.ts` | Authoritative endpoint list + validation |
| `README.md` | Full API reference, roles, auth, SaaS limits, security model |
| `docs/architecture.md` | Architecture notes |
