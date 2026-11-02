-- IF NOT EXISTS so it is safe on databases that already got these columns
-- from `prisma db push`.

-- AlterTable
ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "openingHours" TEXT;
ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
