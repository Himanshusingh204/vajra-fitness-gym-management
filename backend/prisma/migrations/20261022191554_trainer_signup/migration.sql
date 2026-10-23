-- AlterTable
ALTER TABLE "TrainerDetails" ADD COLUMN     "city" TEXT,
ADD COLUMN     "experienceYears" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';
