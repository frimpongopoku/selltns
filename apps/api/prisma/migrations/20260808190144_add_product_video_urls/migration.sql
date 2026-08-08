-- AlterTable
ALTER TABLE "products" ADD COLUMN     "video_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
