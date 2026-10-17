-- Collections used to be ordered by each product's display_order, ignoring
-- position. Now that position drives the order, backfill it from that same
-- display_order so existing collections keep the order shoppers already see.
UPDATE "collection_products" AS cp
SET "position" = ranked.rn
FROM (
  SELECT
    c."collection_id",
    c."product_id",
    ROW_NUMBER() OVER (
      PARTITION BY c."collection_id"
      ORDER BY p."display_order", p."id"
    ) - 1 AS rn
  FROM "collection_products" c
  JOIN "products" p ON p."id" = c."product_id"
) AS ranked
WHERE cp."collection_id" = ranked."collection_id"
  AND cp."product_id" = ranked."product_id";

-- A collection's own products and its affiliate items now share one position
-- space (so they can be interleaved). Affiliate items were always shown after
-- the collection's own products, so renumber them to follow those.
UPDATE "affiliate_collection_items" AS aci
SET "position" = ranked.rn
FROM (
  SELECT
    a."id",
    (SELECT COUNT(*) FROM "collection_products" cp
      WHERE cp."collection_id" = a."collection_id")
    + ROW_NUMBER() OVER (
      PARTITION BY a."collection_id"
      ORDER BY a."position", a."created_at", a."id"
    ) - 1 AS rn
  FROM "affiliate_collection_items" a
) AS ranked
WHERE aci."id" = ranked."id";
