-- Add Razorpay references for online SaaS subscription payments.
ALTER TABLE "GymSubscription" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;
ALTER TABLE "GymSubscription" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;
ALTER TABLE "GymSubscription" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "GymSubscription_razorpayOrderId_idx" ON "GymSubscription"("razorpayOrderId");
