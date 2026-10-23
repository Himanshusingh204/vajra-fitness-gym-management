# Vajra Fitness mobile app

Expo (React Native) app for members, trainers, partners (gym owners) and staff. It uses the same REST API as the website, so there is no separate backend to run.

Stack: Expo SDK 58, Expo Router, TypeScript (strict), TanStack Query, react-hook-form with zod, `expo-secure-store` for the refresh token, Outfit font. No analytics or tracking SDKs.

This folder is a standalone project. It is not an npm workspace, so install it on its own.

## Setup

Node 22 or newer.

```bash
cd mobile
npm install
cp .env.example .env.local   # optional, the defaults point at the live API
npm start
```

| Variable | Default | What it is |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://vajra-fitness-gym-management.vercel.app/api` | API base URL |
| `EXPO_PUBLIC_SITE_URL` | `https://vajra-fitness-gym-management.vercel.app` | Website, used for the partner signup link |

`EXPO_PUBLIC_` values end up inside the app bundle. Never put secrets in them.

To use a local API from a phone, point `EXPO_PUBLIC_API_URL` at your computer's LAN address (for example `http://192.168.1.20:3000/api`), not `localhost`.

## Running on a phone

**Expo Go.** Install Expo Go from the Play Store or App Store, run `npm start`, scan the QR code. Every module the app uses ships with Expo Go, so this is the quickest way to try it.

**Development build.** Closer to the real app (your own icon, name and bundle id):

```bash
npx eas-cli@latest build --profile development --platform android
```

Install the build on the phone, then run `npm start` and open the project from the dev client.

## Building for the stores

`eas.json` has three profiles:

- `development`: dev client, internal distribution.
- `preview`: installable APK for testers.
- `production`: store builds, version number managed by EAS.

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform android   # or ios
```

## Checks

```bash
npm run typecheck                         # tsc --noEmit
npm test                                  # vitest: refresh logic, error messages, formatting
npx expo install --check                  # SDK compatible versions
npx expo export --platform android        # bundles the JS, catches import errors
```

## How it maps to the API

Every request sends `X-Client: mobile`. With that header the API returns the refresh token in the response body instead of a cookie.

- The access token (15 minutes) is kept in memory only. The refresh token goes in the OS keychain or keystore through SecureStore.
- On a 401 the client calls `POST /auth/refresh` with `{ refreshToken }` and retries. The refresh token rotates on every use and presenting an old one ends the session, so parallel requests share a single refresh call (`src/api/client.ts`).
- Sign out calls `POST /auth/logout` with the refresh token and clears it locally even when offline.
- A changed password ends every session on the server, so the app asks you to sign in again.

| Screen | Endpoints |
| --- | --- |
| Sign in, sign up, forgot password | `POST /auth/login`, `/auth/register/member`, `/auth/register/trainer`, `/auth/forgot-password`, gym picker `GET /gym` |
| Session | `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout` |
| Profile | `PUT /auth/profile`, `PUT /auth/password` |
| Member home, workouts, attendance, payments | `/members/my-profile`, `/members/enroll`, `/memberships/my`, `/fees/member/:id`, `/workouts/member/:id`, `/attendance/my` |
| Trainer clients, bookings, workouts | `/members/gym/:gymId`, `/bookings/trainer/my`, `PATCH /bookings/:id`, `/workouts/gym/:gymId`, `POST /workouts/member/:id` |
| Partner today, members, fees, check-in | `/gym/:gymId/stats`, `/attendance/gym/:gymId`, `/enquiries/gym/:gymId`, `/fees/gym/:gymId`, `/members/gym/:gymId`, `/members/:id` |
| Staff check-in, members | `/members/gym/:gymId`, `GET` and `POST /attendance/gym/:gymId` |

Trainers waiting for approval see an "awaiting approval" screen. An expired gym subscription makes the API read-only; the app shows a plain message when a change is refused.

Online fee payment, plans, staff management and reports stay on the website for now. Gym owners register on the website too.

## Project layout

```
app/              screens (Expo Router): (auth), member, trainer, partner, staff, detail screens
src/api/          HTTP client, session storage, endpoint functions, types
src/components/   shared UI
src/screens/      screens shared by more than one role (profile, check-in, members)
src/providers/    auth and theme
src/lib/          formatting, validation, roles
src/theme.ts      colours, type scale, spacing
assets/           icons and splash, generated from frontend/public/favicon.svg
```

## What the owner needs to supply

- An Expo account (free) to run EAS builds.
- A Google Play developer account and an Apple Developer Program membership to publish.
- The bundle id. `app.json` uses `in.vajrafitness.app` for both iOS and Android as a placeholder. Replace it with a reverse domain you own before the first store build; it cannot be changed after publishing.
- A review of the icons and splash in `assets/`. They were generated from the web favicon and are fine for testing, but check them against the store guidelines.
- Store listing text, screenshots and a privacy policy URL.
