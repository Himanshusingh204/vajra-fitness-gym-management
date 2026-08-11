# Vercel Backend Crash — Root Cause Analysis

**Symptom:** every request to the backend service on Vercel returns
`500 FUNCTION_INVOCATION_FAILED`. The frontend build succeeds; the crash
happens at request/invocation time, not build time.

## Files checked

- `vercel.json` (root) — the "Services" monorepo config.
- `backend/package.json` — scripts, `main` field, dependencies.
- `backend/prisma/schema.prisma` — `generator client` block.
- `backend/src/utils/prisma.ts` — Prisma Client instantiation.
- `backend/src/server.ts` / `backend/src/app.ts` — entrypoint and Express app.
- `.gitignore` / `backend/.gitignore` — what actually ships to Vercel.

## Root cause (high confidence)

**`@prisma/client` is never generated during the Vercel build**, so importing
it crashes the function on every cold start.

- `node_modules/` is gitignored everywhere in this repo (root `.gitignore`
  line 1, `backend/.gitignore` line 1) — correct practice, but it means the
  generated Prisma Client (`node_modules/.prisma/client/*`, including the
  compiled query-engine binary) does not exist until something explicitly
  runs `prisma generate`.
- `backend/package.json` has **no `postinstall` script** and the `build`
  script is just `"build": "npx tsc"` — it never calls `prisma generate`.
- The root `vercel.json` `services.backend` block has no `framework` or
  `buildCommand` override, so Vercel's zero-config Node.js build only runs
  `npm install` + `npm run build` (`tsc`). Prisma Client is never generated.
- Result: `backend/src/utils/prisma.ts` does
  `import { PrismaClient, Prisma } from '@prisma/client'` — this import (or
  the `new PrismaClient()` call right after) throws immediately because the
  generated client/engine files aren't present in the deployed bundle. Since
  this happens at module load, it crashes on **every single invocation**,
  matching the reported symptom exactly (not an intermittent or data-specific
  failure — a hard crash on all requests).

This is the same failure mode documented by Prisma/Vercel for any project
that doesn't wire `prisma generate` into the build.

## Contributing issues (secondary, worth fixing while in here)

1. **`backend/package.json` `"main": "index.js"`** points to a file that
   doesn't exist anywhere in the repo (checked — no `backend/index.js`,
   compiled or otherwise). Misleading and could affect entrypoint resolution
   in some tooling; should point at `dist/server.js`.
2. **No Prisma `binaryTargets`** in `schema.prisma`'s `generator client`
   block. Prisma auto-detects `"native"` for both the Vercel build machine
   and the Vercel runtime, which normally match — but pinning
   `binaryTargets = ["native", "rhel-openssl-3.0.x"]` removes any ambiguity
   for Vercel's current Amazon Linux 2023 Node.js runtime and protects
   against a future mismatch if the build/runtime images ever diverge.
3. **`server.ts` calls `app.listen()` and starts an hourly `setInterval`**
   for background jobs at module scope. This is correct for a normal
   always-on host (Render, a VPS, Docker) but has no effect on Vercel's
   request-driven serverless model — the interval never reliably fires
   because the process isn't kept warm between requests. Not the cause of
   this crash (Express apps that also call `.listen()` still work fine as
   Vercel Node functions — the extra listener is just inert), but the
   scheduled jobs (`syncExpiredMemberships`, expiry/fee reminders) silently
   stop running once deployed to Vercel. Documented as a known gap rather
   than fixed in this pass — moving it to a proper Vercel Cron Job is a
   separate, larger change and not needed to resolve today's outage.

## Fix applied

1. Add `"postinstall": "prisma generate"` to `backend/package.json` so the
   client is generated on every `npm install` Vercel runs (covers both the
   build step and keeps local dev consistent).
2. Add `binaryTargets = ["native", "rhel-openssl-3.0.x"]` to
   `schema.prisma`'s `generator client` block.
3. Fix `backend/package.json`'s `"main"` field to `"dist/server.js"`.
4. Verify locally: `npm install` (triggers postinstall → `prisma generate`),
   `npx tsc --noEmit`, `npm run build`, `npm test`.

## Not fixed in this pass (flagged for a follow-up, not blocking today's fix)

- Moving background jobs off `setInterval` onto a Vercel Cron Job hitting a
  dedicated `/api/jobs/run` endpoint, so expiry sync and reminder emails
  actually run on a schedule in the deployed environment.
