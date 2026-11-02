-- Marketplace orders, webhook events, commission rules, ledger and refunds
-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "planSnapshot" JSONB NOT NULL,
    "basePaise" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "commissionPaise" INTEGER NOT NULL,
    "commissionGstPaise" INTEGER NOT NULL,
    "gymNetPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "planId" TEXT,
    "membershipId" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "percentBps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gymId" TEXT,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gymId" TEXT NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "razorpayRefundId" TEXT,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_membershipId_key" ON "Order"("membershipId");

-- CreateIndex
CREATE INDEX "Order_gymId_status_idx" ON "Order"("gymId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_memberUserId_idempotencyKey_key" ON "Order"("memberUserId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key" ON "PaymentEvent"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_gymId_key" ON "CommissionRule"("gymId");

-- CreateIndex
CREATE INDEX "LedgerEntry_gymId_account_idx" ON "LedgerEntry"("gymId", "account");

-- CreateIndex
CREATE INDEX "LedgerEntry_orderId_idx" ON "LedgerEntry"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_sourceType_sourceId_account_key" ON "LedgerEntry"("sourceType", "sourceId", "account");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_razorpayRefundId_key" ON "Refund"("razorpayRefundId");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

