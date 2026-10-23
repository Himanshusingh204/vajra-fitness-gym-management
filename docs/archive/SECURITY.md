# Security policy

VajraFitness stores member contact details and payment records for gyms. Please report vulnerabilities privately. Do not open a public issue.

## How to report

- Preferred: a private report through GitHub Security Advisories on this repository (Security tab, "Report a vulnerability").
- Email: `<security contact address, to be added by the maintainer>`

Include what you found, the impact, steps to reproduce (a minimal proof of concept helps), and the affected endpoint, file or role.

There is no committed response time yet. The maintainer will acknowledge reports as soon as practical and asks for reasonable time to fix an issue before it is disclosed.

## Scope

In scope: the code in this repository, which covers the frontend, backend API, database schema and migrations, the mobile app, and deployment configuration.

Out of scope: third-party services the app depends on (Vercel, Neon, Upstash, Razorpay, SMTP providers). Report problems in those to the provider.

## Supported versions

There are no tagged releases. Only the `main` branch is supported, and fixes land there.

## What is in place

A summary of the controls, for reviewers. Details are in [docs/architecture.md](docs/architecture.md).

- Passwords are hashed with Argon2. Failed logins lock an account after repeated attempts.
- Access tokens are JWTs that expire after 15 minutes. Refresh tokens last 7 days, are stored hashed, rotate on use, and reuse of an old token revokes the session.
- Every tenant query is scoped to the caller's gym on the server, and the test suite checks cross-tenant access.
- Request bodies are validated with Zod. Database access goes through Prisma.
- Rate limits apply to the whole API and more tightly to auth and write routes.
- Razorpay payments and webhooks are verified by signature on the server.
- CI runs CodeQL, dependency review, `npm audit` (report only) and a gitleaks secret scan.

## Known limitations, not vulnerabilities

- Without `REDIS_URL`, rate limiting and login lockout use in-memory state per instance. This is expected for local and single-instance runs.
- Seed scripts create demo accounts with known passwords. They are for development and must not be used in production.
