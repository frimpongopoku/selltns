-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "focus_x" INTEGER,
ADD COLUMN     "focus_y" INTEGER;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "image_focus" JSONB NOT NULL DEFAULT '{}';

