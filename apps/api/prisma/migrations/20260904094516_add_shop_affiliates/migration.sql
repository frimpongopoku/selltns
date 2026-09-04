-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AffiliateCapType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('DIRECT', 'AFFILIATE');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "affiliate_tenant_id" TEXT,
ADD COLUMN     "originating_order_id" TEXT,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'DIRECT';

-- CreateTable
CREATE TABLE "affiliate_relationships" (
    "id" TEXT NOT NULL,
    "owner_tenant_id" TEXT NOT NULL,
    "affiliate_tenant_id" TEXT NOT NULL,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'PENDING',
    "cap_type" "AffiliateCapType" NOT NULL,
    "cap_value" INTEGER NOT NULL,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invited_by_user_id" TEXT NOT NULL,
    "responded_at" TIMESTAMP(3),
    "responded_by_user_id" TEXT,
    "terminated_at" TIMESTAMP(3),
    "terminated_by_user_id" TEXT,
    "history" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_product_exemptions" (
    "id" TEXT NOT NULL,
    "relationship_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_product_exemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_product_listings" (
    "id" TEXT NOT NULL,
    "relationship_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price_override" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_product_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_collection_items" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_relationships_affiliate_tenant_id_status_idx" ON "affiliate_relationships"("affiliate_tenant_id", "status");

-- CreateIndex
CREATE INDEX "affiliate_relationships_owner_tenant_id_status_idx" ON "affiliate_relationships"("owner_tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_relationships_owner_tenant_id_affiliate_tenant_id_key" ON "affiliate_relationships"("owner_tenant_id", "affiliate_tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_product_exemptions_relationship_id_product_id_key" ON "affiliate_product_exemptions"("relationship_id", "product_id");

-- CreateIndex
CREATE INDEX "affiliate_product_listings_relationship_id_idx" ON "affiliate_product_listings"("relationship_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_product_listings_relationship_id_product_id_key" ON "affiliate_product_listings"("relationship_id", "product_id");

-- CreateIndex
CREATE INDEX "affiliate_collection_items_collection_id_idx" ON "affiliate_collection_items"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_collection_items_listing_id_collection_id_key" ON "affiliate_collection_items"("listing_id", "collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_originating_order_id_key" ON "orders"("originating_order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_originating_order_id_fkey" FOREIGN KEY ("originating_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_relationships" ADD CONSTRAINT "affiliate_relationships_owner_tenant_id_fkey" FOREIGN KEY ("owner_tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_relationships" ADD CONSTRAINT "affiliate_relationships_affiliate_tenant_id_fkey" FOREIGN KEY ("affiliate_tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_product_exemptions" ADD CONSTRAINT "affiliate_product_exemptions_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "affiliate_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_product_exemptions" ADD CONSTRAINT "affiliate_product_exemptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_product_listings" ADD CONSTRAINT "affiliate_product_listings_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "affiliate_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_product_listings" ADD CONSTRAINT "affiliate_product_listings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_collection_items" ADD CONSTRAINT "affiliate_collection_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "affiliate_product_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_collection_items" ADD CONSTRAINT "affiliate_collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

