import { PrismaService } from '../prisma/prisma.service';
import type { PreorderInfo } from './types';

// A product is a pre-order item purely by virtue of belonging to a
// PREORDER-type collection — there's no flag on Product itself. Products
// can only carry one active preorder ruleset, so if a product somehow
// ends up in more than one PREORDER collection, the oldest one wins.
export async function getPreorderInfoMap(
  prisma: PrismaService,
  tenantId: string,
  productIds: string[],
): Promise<Map<string, PreorderInfo>> {
  const byProductId = new Map<string, PreorderInfo>();
  if (productIds.length === 0) return byProductId;

  const rows = await prisma.$queryRaw<
    {
      productId: string;
      collectionId: string;
      collectionTitle: string;
      depositType: 'FULL' | 'PERCENTAGE';
      depositPercentage: number | null;
      fulfillmentNote: string;
    }[]
  >`
    SELECT cp.product_id AS "productId", c.id AS "collectionId",
           c.title AS "collectionTitle", c.deposit_type AS "depositType",
           c.deposit_percentage AS "depositPercentage",
           c.fulfillment_note AS "fulfillmentNote"
    FROM collection_products cp
    JOIN collections c ON c.id = cp.collection_id
    WHERE c.tenant_id = ${tenantId}
      AND c.type = 'PREORDER'
      AND cp.product_id = ANY(${productIds})
    ORDER BY c.created_at ASC
  `;
  for (const row of rows) {
    if (byProductId.has(row.productId)) continue;
    byProductId.set(row.productId, {
      collectionId: row.collectionId,
      collectionTitle: row.collectionTitle,
      depositType: row.depositType,
      depositPercentage: row.depositPercentage,
      fulfillmentNote: row.fulfillmentNote,
    });
  }
  return byProductId;
}

export async function attachPreorderInfo<T extends { id: string }>(
  prisma: PrismaService,
  tenantId: string,
  products: T[],
): Promise<(T & { preorder: PreorderInfo | null })[]> {
  if (products.length === 0) return [];
  const byProductId = await getPreorderInfoMap(
    prisma,
    tenantId,
    products.map((p) => p.id),
  );
  return products.map((p) => ({
    ...p,
    preorder: byProductId.get(p.id) ?? null,
  }));
}
