# Troubleshooting

## Common Issues

### Database Connection Errors

Verify `DATABASE_URL` format. For local development with docker-compose:

```
DATABASE_URL="postgresql://vajra_admin:vajra_secure_pass@localhost:5432/vajra_fitness?schema=public"
```

Run `docker compose up -d db` and `npx prisma db push`.

### JWT Errors / Session Not Working

- Verify `JWT_SECRET` is ≥32 characters.
- Ensure access token is stored in memory (not `localStorage`). Check `useAuthStore`.
- Refresh cookie requires `FRONTEND_URL` to match browser origin exactly.

### Subscription Access Blocked

- Check `gymSubscription` status. `TRIAL`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD` allow full access.
- `EXPIRED` allows read-only (view subscription, billing, renew). `SUSPENDED`/`CANCELLED` = blocked.
- Verify `endDate` and `gracePeriodEnd` are correct (timezone-aware). All dates stored in UTC; displayed in user's locale.

### Payment Not Settling

- Verify `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are set.
- Webhook endpoint must be reachable from Razorpay (`{API_URL}/api/payments/webhook`).
- Webhook verification requires exact `RAZORPAY_WEBHOOK_SECRET`.
- Settlement is idempotent: check `PaymentOrder` for existing `orderId` before creating.

### Feature Not Available (403)

- Check `SaaSPlan.features` JSON array includes the feature code (e.g., `INVENTORY`, `CLASSES`).
- Verify subscription `planId` matches the intended plan.
- Check middleware `requireFeature` is applied correctly.

### Rate Limit Blocked

- For multi-instance deployments, move rate limit state from in-memory to Redis.
- Per-email lockout resets after 15 minutes (`LOCKOUT_DURATION_MS`).
- Per-IP limits apply globally.
