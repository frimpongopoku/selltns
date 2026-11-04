-- AlterTable
ALTER TABLE "drop_photos" ADD COLUMN     "media_asset_id" TEXT;

-- CreateIndex
CREATE INDEX "drop_photos_media_asset_id_idx" ON "drop_photos"("media_asset_id");

