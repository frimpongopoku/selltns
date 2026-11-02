-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "photo_drop_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photo_drop_token" TEXT;

-- CreateTable
CREATE TABLE "drop_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "price" INTEGER,
    "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drop_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_photos" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumb_key" TEXT NOT NULL,
    "thumb_url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drop_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "drop_items_tenant_id_idx" ON "drop_items"("tenant_id");

-- CreateIndex
CREATE INDEX "drop_photos_item_id_idx" ON "drop_photos"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_photo_drop_token_key" ON "tenants"("photo_drop_token");

-- AddForeignKey
ALTER TABLE "drop_items" ADD CONSTRAINT "drop_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_photos" ADD CONSTRAINT "drop_photos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "drop_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

