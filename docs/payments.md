# Payments & Security

## Provider Integration

Primary: **Razorpay** (India). Architecture designed for future providers (Stripe, etc.).

## Security Requirements

- Never trust frontend payment success.
- All payment state changes verified server-side via webhook or API verification.
- `POST /payments/verify` verifies `orderId`, `paymentId`, `signature` server-side before updating fee/membership.
- `POST /payments/webhook` verifies Razorpay webhook signature (`RAZORPAY_WEBHOOK_SECRET`) before settlement.
- Settlement is idempotent (prevents duplicate payment settlement).

## Flow

```
Member → Checkout (POST /payments/checkout) → Razorpay Order
Member → Pay → Verify (POST /payments/verify) → Server verifies signature
→ Updates Fee (PAID) + Membership (ACTIVE) → Creates receipt PDF
Razorpay Webhook (payment.captured) → Signature verified → Idempotent settlement
```

## Financial Safety

- Monetary values use `Decimal` (Prisma `Decimal` → PostgreSQL `numeric`) to avoid floating-point errors.
- All calculations are deterministic.
- Invoice totals derived from `subtotal + tax - discount`.
