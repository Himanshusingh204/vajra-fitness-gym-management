-- Gym lifecycle and profile fields
ALTER TABLE "Gym" ADD COLUMN     "accessibility" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "establishedYear" INTEGER,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "parking" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "rules" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT';

-- Approved gyms are APPROVED. An unapproved gym whose owner is deactivated was
-- suspended by the platform; any other unapproved gym goes back to DRAFT so the
-- owner finishes the onboarding wizard (documents, plans) and submits it.
UPDATE "Gym" g SET "status" = CASE
    WHEN g."isApproved" THEN 'APPROVED'
    WHEN u."isActive" = false THEN 'SUSPENDED'
    ELSE 'DRAFT'
  END
FROM "User" u WHERE u."id" = g."ownerId";

-- Free-text facilities ("Sauna, Free weights") become a list.
ALTER TABLE "Gym" ALTER COLUMN "facilities" TYPE TEXT[] USING
  array_remove(string_to_array(regexp_replace(btrim(coalesce("facilities", '')), '\s*,\s*', ',', 'g'), ','), '');
ALTER TABLE "Gym" ALTER COLUMN "facilities" SET DEFAULT ARRAY[]::TEXT[];

-- Slugs: the website subdomain where there is one, else the name. A name taken
-- twice gets part of the id appended.
UPDATE "Gym" SET "slug" = "subdomain" WHERE "subdomain" IS NOT NULL;
WITH base AS (
  SELECT "id", coalesce(nullif(btrim(lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')), '-'), ''), 'gym') AS s
  FROM "Gym" WHERE "slug" IS NULL
), ranked AS (
  SELECT "id", s, row_number() OVER (PARTITION BY s ORDER BY "id") AS rn FROM base
)
UPDATE "Gym" g SET "slug" = CASE
    WHEN r.rn = 1 AND NOT EXISTS (SELECT 1 FROM "Gym" x WHERE x."slug" = r.s) THEN r.s
    ELSE r.s || '-' || left(g."id", 8)
  END
FROM ranked r WHERE g."id" = r."id";


-- CreateTable
CREATE TABLE "TrainerQualification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "year" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trainerId" TEXT NOT NULL,
    "documentId" TEXT,

    CONSTRAINT "TrainerQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerAvailability" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "trainerId" TEXT NOT NULL,

    CONSTRAINT "TrainerAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gymId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,

    CONSTRAINT "TrainerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "ref" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentValue" JSONB,
    "proposedValue" JSONB,
    "openKey" TEXT,
    "requesterRole" TEXT NOT NULL,
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gymId" TEXT,
    "requesterId" TEXT NOT NULL,
    "reviewerId" TEXT,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalEvent" (
    "id" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT,

    CONSTRAINT "ApprovalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDocument" (
    "requestId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "ApprovalDocument_pkey" PRIMARY KEY ("requestId","documentId")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainerQualification_trainerId_idx" ON "TrainerQualification"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerAvailability_trainerId_weekday_idx" ON "TrainerAvailability"("trainerId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerInvite_tokenHash_key" ON "TrainerInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "TrainerInvite_gymId_idx" ON "TrainerInvite"("gymId");

-- CreateIndex
CREATE INDEX "TrainerInvite_email_idx" ON "TrainerInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_seq_key" ON "ApprovalRequest"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_ref_key" ON "ApprovalRequest"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_openKey_key" ON "ApprovalRequest"("openKey");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_type_idx" ON "ApprovalRequest"("status", "type");

-- CreateIndex
CREATE INDEX "ApprovalRequest_gymId_idx" ON "ApprovalRequest"("gymId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requesterId_idx" ON "ApprovalRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ApprovalEvent_requestId_idx" ON "ApprovalEvent"("requestId");

-- CreateIndex
CREATE INDEX "ApprovalDocument_documentId_idx" ON "ApprovalDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_name_key" ON "Facility"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Gym_slug_key" ON "Gym"("slug");

-- CreateIndex
CREATE INDEX "Gym_status_city_idx" ON "Gym"("status", "city");

-- CreateIndex
CREATE INDEX "Gym_lat_lng_idx" ON "Gym"("lat", "lng");

-- AddForeignKey
ALTER TABLE "TrainerQualification" ADD CONSTRAINT "TrainerQualification_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "TrainerDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerQualification" ADD CONSTRAINT "TrainerQualification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerAvailability" ADD CONSTRAINT "TrainerAvailability_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "TrainerDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInvite" ADD CONSTRAINT "TrainerInvite_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInvite" ADD CONSTRAINT "TrainerInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDocument" ADD CONSTRAINT "ApprovalDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDocument" ADD CONSTRAINT "ApprovalDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

