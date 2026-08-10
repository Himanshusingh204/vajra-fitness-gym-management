-- White-label branding (Phase 2 #9)

-- AlterTable
ALTER TABLE "Gym" ADD COLUMN "brandColor" TEXT,
ADD COLUMN "tagline" TEXT,
ADD COLUMN "subdomain" TEXT,
ADD COLUMN "customDomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Gym_subdomain_key" ON "Gym"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Gym_customDomain_key" ON "Gym"("customDomain");
