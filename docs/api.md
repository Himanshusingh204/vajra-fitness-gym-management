# API changes: accounts, trainers, public gym pages

This covers the endpoints added or changed for trainer signup, profiles, the mobile app and the public gym pages. Everything else in the API is unchanged.

All paths are under `/api`. Errors always come back as `{ "error": "message" }`. Validation failures are `400` with an extra `issues` array:

```json
{ "error": "Invalid request payload", "issues": [{ "path": "phone", "message": "phone must be a valid Indian mobile number (10 digits, starting 6-9, +91 optional)" }] }
```

## Route groups

Mounted in `backend/src/app.ts`. Public and auth routes need no subscription. Tenant routes pass through the subscription gate, and writes are blocked once a gym is read-only.

| Prefix | Area |
| --- | --- |
| `/auth`, `/public`, `/payments` | Sign in and sign up, public content, Razorpay checkout and webhook |
| `/admin`, `/saas` | Super admin tools, SaaS plans and subscriptions |
| `/members`, `/plans`, `/memberships`, `/fees`, `/attendance` | Members, membership plans, memberships, fees, check-in |
| `/staff`, `/branches`, `/gym`, `/enquiries`, `/notices`, `/support` | Gym setup and communication |
| `/workouts`, `/bookings`, `/progress`, `/nutrition`, `/classes` | Training |
| `/inventory`, `/equipment`, `/expenses`, `/payslips`, `/referrals`, `/reports`, `/notifications` | Operations and reporting |
| `/health`, `/ready`, `/metrics`, `/internal/cron` | Operations endpoints (`/metrics` is served at the site root) |

The sections below cover what changed for trainer signup, profiles, the mobile app and public gym pages. [detailed_overview.md](detailed_overview.md) lists the older endpoints.

## Mobile token flow

The web app keeps its refresh token in an httpOnly cookie. The mobile app has no cookie jar, so it sends `X-Client: mobile` on the auth calls and stores the refresh token itself (secure storage).

| Call | Web (no header) | Mobile (`X-Client: mobile`) |
| --- | --- | --- |
| `POST /auth/login`, `POST /auth/register/member`, `/register/trainer`, `/register/vendor` | sets the `refreshToken` cookie | no cookie, `refreshToken` in the JSON body |
| `POST /auth/refresh` | reads the cookie, sets a new one, returns `{ token }` | reads `{ "refreshToken": "..." }` from the body, returns `{ token, refreshToken }` |
| `POST /auth/logout` | revokes the cookie token and clears the cookie | revokes `{ "refreshToken": "..." }` from the body |

- Refresh tokens rotate on every refresh. Always replace the stored token with the new one.
- Sending an already used refresh token is treated as theft: the whole session family is revoked and the call returns `401 { "error": "Session reuse detected. Please log in again." }`. The app should then drop both tokens and show the login screen.
- In mobile mode the cookie is ignored, and in web mode a body token is ignored.
- The access token (`token`) lasts 15 minutes and goes in `Authorization: Bearer <token>` as before. Refresh tokens last 7 days.
- Native apps send no `Origin` header, so CORS and the refresh origin check do not apply to them.

Example mobile login response:

```json
{
  "message": "Logged in successfully",
  "token": "<jwt>",
  "refreshToken": "<96 hex chars>",
  "user": { "id": "uuid", "username": "Ravi", "email": "ravi@example.com", "role": "MEMBER" }
}
```

## Trainer signup

### `POST /auth/register/trainer`

Public. Rate limited like the other register calls.

Body:

| Field | Type | Rules |
| --- | --- | --- |
| `username` | string | required, 2 to 60 chars |
| `email` | string | required, no disposable domains |
| `password` | string | required, 8+ chars with a letter and a number |
| `phone` | string | required, Indian mobile, stored as 10 digits |
| `gymId` | uuid | required, must be an approved gym |
| `specialization` | string | optional, max 80 |
| `experienceYears` | integer | optional, 0 to 60 |
| `city` | string | optional, max 80 |
| `bio` | string | optional, max 600 |

`201`:

```json
{
  "message": "Application sent. The gym will review it soon.",
  "token": "<jwt>",
  "user": { "id": "uuid", "username": "Asha Rao", "email": "asha@example.com", "role": "TRAINER" },
  "trainerStatus": "PENDING"
}
```

Plus `refreshToken` in mobile mode. The gym owner gets a notification.

Errors: `400` validation, `404 Gym not found`, `403 This gym is not accepting trainer applications yet` (gym not approved), `409 An account with this email already exists`.

### Pending and rejected trainers

A trainer whose application is not approved can sign in, but every authenticated endpoint except the account ones answers:

```json
403 { "error": "Your trainer application is awaiting approval", "code": "TRAINER_PENDING" }
403 { "error": "Your trainer application was not approved", "code": "TRAINER_REJECTED" }
```

Still allowed: `GET /auth/me`, `GET /auth/profile`, `PUT /auth/profile`, `PUT /auth/password`, `POST /auth/refresh`, `POST /auth/logout`. Clients should show an "awaiting approval" screen on either code.

Trainers added by a gym admin from staff management are `ACTIVE` straight away, as before.

### `GET /auth/me` (changed)

Same response as before. For a trainer it also has `trainerStatus`: `"ACTIVE"`, `"PENDING"` or `"REJECTED"`. The nested `trainerDetails` now also carries `status`, `experienceYears` and `city`.

## Trainer applications (gym admin)

Gym admin only (Super Admin may act on any gym). Scoped to the caller's own gym.

### `GET /staff/gym/:gymId/trainer-applications?status=PENDING|REJECTED`

`status` defaults to `PENDING`. Newest first.

`200`:

```json
[
  {
    "id": "trainer-details-uuid",
    "status": "PENDING",
    "specialization": "Mobility",
    "experienceYears": 4,
    "city": "Pune",
    "bio": "Former sprinter...",
    "joiningDate": "2026-10-22T10:00:00.000Z",
    "gymId": "uuid",
    "user": { "id": "uuid", "username": "Asha Rao", "email": "asha@example.com", "phone": "9876501234", "createdAt": "2026-10-22T10:00:00.000Z" }
  }
]
```

`joiningDate` is the application date while pending and becomes the approval date once approved.

Errors: `400` bad id or status, `403 Unauthorized` (not your gym).

### `PUT /staff/trainer-applications/:id/approve`

`:id` is the application `id` from the list. No body. Sets the trainer `ACTIVE`, notifies them and writes a `TRAINER_APPROVED` audit entry.

`200`: the same object as one list item, with `"status": "ACTIVE"`.

Errors: `404 Trainer application not found` (also for another gym's application), `400 This application has already been reviewed`, `402` when the gym's plan trainer limit is already full.

### `PUT /staff/trainer-applications/:id/reject`

Optional body `{ "reason": "max 500 chars" }`, included in the trainer's notification. Sets `REJECTED`, keeps the account, writes a `TRAINER_REJECTED` audit entry.

`200`: the same object as one list item, with `"status": "REJECTED"`.

Errors: `404`, `400` as for approve.

### `GET /staff/gym/:gymId` (changed)

`trainers` now lists only `ACTIVE` trainers. Pending and rejected applications are only in the endpoint above.

## Profile

Any signed-in user, including pending trainers.

### `GET /auth/profile`

`200`:

```json
{
  "id": "uuid",
  "username": "Ravi Kumar",
  "email": "ravi@example.com",
  "phone": "9812345670",
  "role": "MEMBER",
  "isActive": true,
  "createdAt": "2026-10-01T09:30:00.000Z",
  "gym": { "id": "uuid", "name": "Peak Club" }
}
```

`gym` is the owned gym for a gym admin, the member's, trainer's or staff member's gym otherwise, and `null` when there is none (Super Admin, member without a gym). Trainers also get `trainerStatus`.

### `PUT /auth/profile`

Body: `{ "username"?: string, "phone"?: string | "" | null }`. At least one field. `""` or `null` clears the phone. Any other key (`email`, `role`, `isActive`...) is a `400`; email and password have their own flows.

`200`: the same shape as `GET /auth/profile`.

## Public gym page

### `GET /public/gyms/:gymId`

No auth. Approved gyms only. Cached for 60 seconds.

`200`:

```json
{
  "id": "uuid",
  "name": "Peak Club",
  "tagline": "Lift heavy, rest well",
  "address": "2 Test Ave",
  "city": "Mumbai",
  "state": "MH",
  "location": null,
  "facilities": "Free weights, Sauna",
  "brandColor": "#800020",
  "imageUrl": null,
  "logoUrl": null,
  "branches": [{ "id": "uuid", "name": "Kothrud", "city": "Pune" }],
  "plans": [{ "id": "uuid", "name": "Monthly", "description": null, "price": 1500, "duration": 30 }],
  "trainerCount": 1,
  "trainers": [{ "name": "Coach", "specialization": "Strength", "experienceYears": 6 }]
}
```

- `plans` are active plans, cheapest first. `price` is a number (rupees), `duration` is in days.
- `trainers` are active trainers only, with no contact details.
- `branches` are approved, active branches.
- No owner details and no GSTIN.

Errors: `400` invalid id, `404 Gym not found` (missing or not approved).

### `GET /gym` (changed)

Same list as before, but each gym now carries only public fields: `id, name, address, city, state, location, logoUrl, imageUrl, facilities, tagline, brandColor, isApproved, membershipPlans[]` (plans: `id, name, description, duration, price, isActive`). `ownerId`, `gstNumber`, `subdomain`, `customDomain` and timestamps are gone.

## Sitemap

### `GET /public/sitemap.xml`

No auth. `Content-Type: application/xml`, `Cache-Control: public, max-age=3600`. `vercel.json` has no rewrite for `/sitemap.xml` yet, so crawlers get the static `frontend/public/sitemap.xml` at that path; point them at this endpoint or add the rewrite.

Lists the static public pages plus `/gyms/<id>` with `<lastmod>` for every approved gym. The base URL comes from `PUBLIC_SITE_URL` (default `https://vajra-fitness-gym-management.vercel.app`).
