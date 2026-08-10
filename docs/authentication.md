# Authentication & Authorization

## Roles

- `SUPER_ADMIN`: Entire platform
- `GYM_ADMIN`: Own gym(s)
- `BRANCH_ADMIN`: Specific branch
- `MANAGER`: Operational management
- `TRAINER`: Workout/PT/member-related
- `STAFF` / `RECEPTIONIST`: Attendance, memberships, payments, basic operations
- `MEMBER`: Own data only

## Token Flow

1. `POST /auth/login` → `{ token }` + `Set-Cookie: refreshToken` (httpOnly, Secure in prod, SameSite=Strict)
2. `POST /auth/refresh` → new access token + rotated refresh cookie
3. `POST /auth/logout` → revokes session family, clears cookie
4. `POST /auth/activate` → one-time activation link (token from DB) → set password
5. `POST /auth/forgot-password` / `reset-password` → one-time reset tokens

## Security Controls

- Memory-only access token (never `localStorage`)
- Refresh tokens hashed (SHA-256) in PostgreSQL
- Token rotation on every refresh
- Reuse detection: old token reuse revokes entire family
- Lockout on 5 failed login attempts per email
- Rate limiting on auth endpoints
- Zod validation on all inputs
- Helmet security headers (CSP, HSTS preload, frame-ancestors 'none', Permissions-Policy)
- CORS locked to `FRONTEND_URL` + `CORS_ORIGINS`
