# Security Policy

VajraFitness handles member PII and payment data for real gyms. If you
find a security vulnerability, please report it privately — do not open
a public GitHub issue.

## Reporting a vulnerability

Email **himanshuyt21361@gmail.com** with:

- A description of the vulnerability and its potential impact.
- Steps to reproduce (a minimal proof-of-concept if possible).
- Any affected endpoint(s), file(s), or user role(s).

You should receive an acknowledgement within 48 hours. We'll keep you
updated as the issue is triaged and fixed, and we ask that you give us a
reasonable window to patch before any public disclosure.

## Scope

In scope: the application code in this repository (frontend, backend,
API, database schema/migrations, deployment configuration).

Out of scope: third-party services this app integrates with (Razorpay,
Neon, Vercel, SMTP providers) — report issues in those directly to the
provider.

## Supported versions

This project does not yet publish tagged releases; the `main` branch is
the only supported version. Fixes land there directly.

## Known limitations (not vulnerabilities to report)

- Rate limiting and brute-force lockout fall back to in-memory,
  per-instance state when `REDIS_URL` is not configured — a documented
  tradeoff for single-instance/local deployments, not a bug.
- Seeded demo accounts (see `backend/scripts/seed*.ts`) use known
  passwords by design and must be rotated before production use.
