-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_section_visible" BOOLEAN NOT NULL DEFAULT false;
