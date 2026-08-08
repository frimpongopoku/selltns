-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "owner_bio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "owner_display_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "owner_info_visible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "owner_title" TEXT NOT NULL DEFAULT '';
