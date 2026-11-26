-- Refund decisions, payout accounts, Route payouts and reconciliation issues.
-- Order.membershipId is no longer unique: a purchase while a membership is active extends it.
-- DropIndex
DROP INDEX "Order_membershipId_key";

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedById" TEXT;

-- CreateTable
CREATE TABLE "GymPayoutAccount" (
    "id" TEXT NOT NULL,
    "razorpayAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_KYC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gymId" TEXT NOT NULL,

    CONSTRAINT "GymPayoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "razorpayTransferId" TEXT,
    "failureReason" TEXT,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gymId" TEXT NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationIssue" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "details" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymPayoutAccount_gymId_key" ON "GymPayoutAccount"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_razorpayTransferId_key" ON "Payout"("razorpayTransferId");

-- CreateIndex
CREATE INDEX "Payout_gymId_status_idx" ON "Payout"("gymId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationIssue_kind_ref_key" ON "ReconciliationIssue"("kind", "ref");

-- CreateIndex
CREATE INDEX "Order_membershipId_idx" ON "Order"("membershipId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- AddForeignKey
ALTER TABLE "GymPayoutAccount" ADD CONSTRAINT "GymPayoutAccount_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
