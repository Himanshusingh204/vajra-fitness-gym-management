# Mobile app

The Expo app in `mobile/` is a native client of the same REST API the website uses. Setup, builds and the screen to endpoint map are in [../mobile/README.md](../mobile/README.md).

## Design

- **Separate install.** `mobile/` has its own `package.json` and lockfile and is not an npm workspace, so the Vercel build and CI installs are unchanged.
- **Routing.** Expo Router. `app/index.tsx` sends the signed in user to a tab set by role: member, trainer, partner (`GYM_ADMIN`) or staff. Super admins are pointed to the website.
- **Auth.** Requests carry `X-Client: mobile`, so the API returns the rotating refresh token in the body instead of a cookie. The access token stays in memory; the refresh token is in the OS keychain through `expo-secure-store`. Refresh on 401 is single flight because the server revokes the session when an old refresh token is reused.
- **Data.** TanStack Query with pull to refresh on every list. Client errors are not retried. `403 SUBSCRIPTION_READONLY`, `TRAINER_PENDING` and network failures get plain messages (`src/api/errors.ts`).
- **Theme.** Tokens in `src/theme.ts` follow the web brand: burgundy accent, graphite and off-white surfaces, Outfit, 14px cards and 10px controls. Light, dark or system, chosen in Profile.
- **Scope.** Payments, plans, staff and reports stay on the website. The app covers daily use: membership status, workouts, attendance, fees, bookings and front desk check-in.

## Running it

Node 22 or newer. The app is installed on its own:

```bash
cd mobile
npm install
npm start          # scan the QR code with Expo Go
```

`EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SITE_URL` set the API and website addresses; by default they point at the deployed site. To test against a local API from a phone, use your computer's LAN address, not `localhost`. Do not point a local or test build at production data you are not prepared to change. Checks: `npm run typecheck` and `npm test`. Store builds use EAS (`eas.json` has `development`, `preview` and `production` profiles). The bundle id in `app.json` is a placeholder and must be replaced before a store release.

## Token flow

1. Every request carries `X-Client: mobile`.
2. `POST /auth/login` (and the register calls) return `token` (15 minute access token) and `refreshToken` (7 days) in the JSON body. No cookie is set.
3. On a 401 the client calls `POST /auth/refresh` with `{ "refreshToken": "..." }`, stores the new pair and retries once.
4. Reusing an old refresh token revokes the session, which is why refreshes are serialized.
5. `POST /auth/logout` with the refresh token revokes it on the server.

Request and response details are in [api.md](api.md#mobile-token-flow).
