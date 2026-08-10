# Security

## Controls

- **Auth**: JWT (15min) + HTTP-only refresh cookie (7d). Memory-only access token. Rotation + reuse detection.
- **Passwords**: Argon2 (primary), bcrypt auto-migration on login.
- **Rate Limiting**: Per-IP global limiter + per-email auth lockout + per-endpoint limiters.
- **CORS**: Locked to `FRONTEND_URL` + `CORS_ORIGINS`; `credentials: true`.
- **Headers**: Helmet (CSP, HSTS preload, `frame-ancestors 'none'`, referrer policy, Permissions-Policy).
- **Validation**: Zod on every input. No raw SQL (Prisma parameterized queries only).
- **Tenant Isolation**: Every endpoint verifies `gymId` ownership. No cross-gym access.
- **Subscription Enforcement**: Every protected route verifies subscription status, feature entitlement, and resource limits.
- **Payment Security**: Server-side verification + webhook signature check + idempotent settlement.
- **Audit Logging**: `AuditLog` records actor, action, resource, resource ID, gym, timestamp, IP, user agent.

## IDOR Prevention

Every resource endpoint verifies:

- `gymId` matches the user's gym (for GYM_ADMIN, STAFF, TRAINER, MEMBER)
- `SUPER_ADMIN` has full access but is audited
- Member self-service verifies `userId` matches the resource owner

## Security Tests

Tests must cover:

- Gym A → Gym B member (should return 403)
- Gym A → Gym B payment (403)
- Member A → Member B profile (403)
- Expired gym → restricted endpoint (403)
- Suspended gym → blocked endpoint (403)
- Feature not entitled → 403
- Plan limit exceeded → 402

## Infrastructure & Operational Security

- **Encryption in Transit**: Enforced TLS 1.2/1.3 across all public endpoints.
- **Encryption at Rest**: Database volumes (PostgreSQL) and automated backups are encrypted at rest using AES-256 (via cloud provider).
- **Network Isolation**: The database operates within a Virtual Private Cloud (VPC) and is not exposed to the public internet. Access is restricted to the backend API via internal networking.
- **DDoS & Edge Protection**: Traffic is routed through a Web Application Firewall (WAF) to filter malicious traffic and mitigate DDoS attacks.
- **Dependency Security**: CI/CD pipelines automatically scan `npm` dependencies (using tools like Dependabot/Snyk) to block deployments containing known vulnerabilities (CVEs).

## Data Privacy & Compliance

- **Data Minimization**: Only essential PII (name, phone, email) is collected.
- **Data Deletion**: Supported "Right to be Forgotten" capability. When a user account is fully deleted, all associated PII is hard-deleted from the database in compliance with GDPR and DPDP acts.
- **Backups & Disaster Recovery (BDR)**: Automated Point-in-Time Recovery (PITR) backups are taken daily and retained for 7 days, allowing targeted rollback in case of catastrophic failure.

## Incident Response & Vulnerability Reporting

- **Reporting**: Security researchers and users are encouraged to report vulnerabilities securely to `security@vajrafitness.in`.
- **SLA**: We aim to acknowledge vulnerability reports within 24 hours and patch critical security flaws within 72 hours.
- **Breach Notification**: In the event of a confirmed data breach, affected Gym Owners will be notified within 72 hours with details of the compromised data and remediation steps.
