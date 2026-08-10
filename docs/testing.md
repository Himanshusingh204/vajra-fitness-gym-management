# Testing

## Unit Tests

Test business logic independently:

- `entitlements.service.ts`: limit calculation, feature entitlement
- `subscription.service.ts`: lifecycle states, upgrade/downgrade, invoice calculation
- `payment.service.ts`: idempotent settlement, webhook verification
- `membership.service.ts`: status derivation (ACTIVE, EXPIRED, EXPIRING_SOON)

## Integration Tests

Cover full request/response cycles:

- Authentication: login, refresh rotation, reuse detection, activation, lockout
- Authorization: role guards, gym isolation (IDOR), SUPER_ADMIN bypass
- Entitlements: plan limits (402), feature gating (403)
- Membership lifecycle: creation, renewal, freeze, expiry sync
- Subscriptions: trial → active → grace → expired → renewal
- Payments: Razorpay checkout, verify, webhook, idempotency

Every test that verifies isolation must fail if isolation is broken.

## E2E Scenarios

1. Gym owner registers → buys plan → creates gym → logs in → adds member
2. Member receives activation → creates password → logs in → views membership
3. Member pays fee → payment verified → receipt generated
4. Subscription expires → restricted access → renewal → full access restored
5. Gym A attempts to access Gym B → 403
6. Plan member limit reached → creation blocked (402)
7. Gym upgrades plan → additional features unlocked
8. Gym downgrades plan → existing data preserved, new limits enforced
