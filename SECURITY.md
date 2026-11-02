# Security policy

Report vulnerabilities privately to security@kavachfitness.in. Please do not open a public issue.

Include what you found, how to reproduce it and the affected URL or endpoint. We aim to reply within 3 working days and will tell you when a fix ships.

Only the latest deployed version is supported.

## Controls

- Gym identity fields (name, address, city, state, phone, email, GST) cannot be changed by owners directly. Changes go through an admin-approved ApprovalRequest. Duplicate gym checks (name + city, phone, GST) run at registration, change request and approval.
- Uploads are checked by file type from the bytes, and size limits apply. Only GALLERY images are public at `/api/images/:id`. Every other file needs a 5-minute signed link.
- Trainer invite tokens are stored hashed, expire after 7 days and are single use.
- Orders require an `Idempotency-Key`. The Razorpay webhook verifies the signature, dedupes on event id (PaymentEvent), ignores amount mismatches, and writes ledger rows in one transaction.

The address `security@kavachfitness.in` depends on the domain `kavachfitness.in`, which is not registered yet. Until it is, report through GitHub Security Advisories on the repository ("Report a vulnerability").
