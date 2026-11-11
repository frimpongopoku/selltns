-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "product_sheet_all" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "product_sheet_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "product_sheet_product_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "product_sheet_token" TEXT;

-- CreateTable
CREATE TABLE "product_suggestions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT,
    "changes" JSONB NOT NULL,
    "base" JSONB NOT NULL DEFAULT '{}',
    "author" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_suggestions_product_id_key" ON "product_suggestions"("product_id");

-- CreateIndex
CREATE INDEX "product_suggestions_tenant_id_idx" ON "product_suggestions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_product_sheet_token_key" ON "tenants"("product_sheet_token");

-- AddForeignKey
ALTER TABLE "product_suggestions" ADD CONSTRAINT "product_suggestions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suggestions" ADD CONSTRAINT "product_suggestions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

