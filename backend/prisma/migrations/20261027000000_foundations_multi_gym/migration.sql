-- One-time tokens: keep only their sha256. Existing rows are hashed in place,
-- so links already sent keep working.
UPDATE "ActivationToken" SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex');
UPDATE "PasswordResetToken" SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex');

ALTER TABLE "ActivationToken" RENAME COLUMN "token" TO "tokenHash";
ALTER INDEX "ActivationToken_token_key" RENAME TO "ActivationToken_tokenHash_key";
ALTER INDEX "ActivationToken_token_idx" RENAME TO "ActivationToken_tokenHash_idx";

ALTER TABLE "PasswordResetToken" RENAME COLUMN "token" TO "tokenHash";
ALTER INDEX "PasswordResetToken_token_key" RENAME TO "PasswordResetToken_tokenHash_key";
ALTER INDEX "PasswordResetToken_token_idx" RENAME TO "PasswordResetToken_tokenHash_idx";

-- A user can be a member at many gyms, once per gym. Existing rows already
-- satisfy this because userId was unique.
DROP INDEX "MemberDetails_userId_key";
CREATE UNIQUE INDEX "MemberDetails_userId_gymId_key" ON "MemberDetails"("userId", "gymId");

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerUserId" TEXT NOT NULL,
    "gymId" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_status_runAt_idx" ON "Job"("status", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_ownerUserId_idx" ON "Document"("ownerUserId");

-- CreateIndex
CREATE INDEX "Document_gymId_idx" ON "Document"("gymId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
