-- AlterTable
ALTER TABLE "FAQ" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gymName" TEXT;

-- CreateTable
CREATE TABLE "SiteContent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "section" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteContent_key_key" ON "SiteContent"("key");

-- CreateIndex
CREATE INDEX "SiteContent_isActive_idx" ON "SiteContent"("isActive");

-- CreateIndex
CREATE INDEX "FAQ_isActive_order_idx" ON "FAQ"("isActive", "order");

-- CreateIndex
CREATE INDEX "Testimonial_isActive_featured_idx" ON "Testimonial"("isActive", "featured");
