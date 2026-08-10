# Subscriptions & Billing

## SaaS Plans (`SaaSPlan`)

- `name`, `code` (unique), `description`
- Pricing: `monthlyPrice`, `quarterlyPrice`, `halfYearlyPrice`, `yearlyPrice` (Decimal)
- Currency: `currency` (default INR)
- Limits: `maxMembers`, `maxTrainers`, `maxStaff`, `maxBranches`, `maxClasses`, `maxStorageMB`
- Features: `features` (JSON array of feature codes)
- `isActive`, `sortOrder`

## Gym Subscriptions (`GymSubscription`)

States: `TRIAL`, `PENDING_PAYMENT`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, `EXPIRED`, `SUSPENDED`, `CANCELLED`

Fields: `status`, `startDate`, `endDate`, `amount`, `billingCycle`, `paymentMethod`, `razorpayOrderId`, `razorpayPaymentId`, `paidAt`, `trialEndsAt`, `gracePeriodEnd`, `autoRenew`, `cancelledAt`, `cancellationReason`

## Access Control

Every protected route passes through `requireValidSubscription`. Read-only mode applies for `EXPIRED`. `requireWriteAccess` blocks mutations for `EXPIRED`/`SUSPENDED`. `requireFeature` blocks feature access.

## Grace Period

Configurable (`GRACE_PERIOD_DAYS` in `subscription.service.ts`). When subscription expires, `processExpiredSubscriptions` sets `GRACE_PERIOD` with a new `gracePeriodEnd` date. After grace period ends, status becomes `EXPIRED` and access is restricted.

## Upgrade / Downgrade

- `upgradeSubscription`: Cancels current, creates new `ACTIVE` subscription with new plan.
- `downgradeSubscription`: Cancels current, creates new `ACTIVE` subscription. Existing data is preserved but new creation is restricted by new limits.

## Invoices (`SubscriptionInvoice`)

Includes `invoiceNumber`, `gymName`, `ownerName`, `billingAddress`, `gstin`, `planName`, `billingPeriod`, `subtotal`, `taxRate`, `taxAmount`, `cgst`, `sgst`, `igst`, `discount`, `total`, `status`, `paymentMethod`, `transactionId`, `issueDate`, `dueDate`.
