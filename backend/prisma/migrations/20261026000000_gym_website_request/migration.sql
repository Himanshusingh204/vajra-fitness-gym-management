-- Written with IF NOT EXISTS because some environments already got this
-- table from `prisma db push` before the migration existed.

-- CreateTable
CREATE TABLE IF NOT EXISTS "GymWebsiteRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "desiredSlug" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gymId" TEXT NOT NULL,

    CONSTRAINT "GymWebsiteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GymWebsiteRequest_desiredSlug_key" ON "GymWebsiteRequest"("desiredSlug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GymWebsiteRequest_status_idx" ON "GymWebsiteRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GymWebsiteRequest_gymId_idx" ON "GymWebsiteRequest"("gymId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GymWebsiteRequest_gymId_fkey') THEN
    ALTER TABLE "GymWebsiteRequest" ADD CONSTRAINT "GymWebsiteRequest_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
