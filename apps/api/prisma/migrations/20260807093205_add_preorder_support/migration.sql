-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('STANDARD', 'PREORDER');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('STANDARD', 'PREORDER');

-- CreateEnum
CREATE TYPE "DepositType" AS ENUM ('FULL', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "deposit_percentage" INTEGER,
ADD COLUMN     "deposit_type" "DepositType",
ADD COLUMN     "fulfillment_note" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "type" "CollectionType" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "balance_amount" INTEGER,
ADD COLUMN     "balance_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "balance_paid_at" TIMESTAMP(3),
ADD COLUMN     "balance_requested_at" TIMESTAMP(3),
ADD COLUMN     "delivery_address" TEXT,
ADD COLUMN     "deposit_amount" INTEGER,
ADD COLUMN     "deposit_percentage" INTEGER,
ADD COLUMN     "deposit_type" "DepositType",
ADD COLUMN     "type" "OrderType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "whatsapp_number" TEXT;
