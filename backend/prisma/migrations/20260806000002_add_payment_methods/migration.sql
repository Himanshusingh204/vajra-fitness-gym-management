-- Add payment-method tracking for membership preferences and gym subscriptions
ALTER TABLE "GymSubscription" ADD COLUMN "paymentMethod" TEXT;

ALTER TABLE "MemberDetails" ADD COLUMN "preferredPaymentMethod" TEXT;
