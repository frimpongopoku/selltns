-- Money moves from whole cedis to pesewas (1 GHS = 100), so prices like
-- GHS 4.99 can be stored. Still whole numbers, so totals, deposits and
-- affiliate caps never pick up rounding errors. Values are unchanged:
-- every amount is multiplied by 100.

UPDATE "products" SET
  "price" = "price" * 100,
  "discount_price" = "discount_price" * 100,
  "affiliate_price" = "affiliate_price" * 100;

UPDATE "drop_items" SET "price" = "price" * 100 WHERE "price" IS NOT NULL;

UPDATE "affiliate_product_listings" SET "price_override" = "price_override" * 100
WHERE "price_override" IS NOT NULL;

-- Only fixed caps are money; percentage caps stay as they are.
UPDATE "affiliate_relationships" SET "cap_value" = "cap_value" * 100
WHERE "cap_type" = 'FIXED';

UPDATE "orders" SET
  "total" = "total" * 100,
  "deposit_amount" = "deposit_amount" * 100,
  "balance_amount" = "balance_amount" * 100;

-- Each order line's priceAtOrder, inside the items JSON array.
UPDATE "orders" o SET "items" = (
  SELECT COALESCE(jsonb_agg(
    CASE WHEN item ? 'priceAtOrder'
      THEN jsonb_set(item, '{priceAtOrder}', to_jsonb((item->>'priceAtOrder')::numeric * 100))
      ELSE item END
    ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements(o."items"::jsonb) WITH ORDINALITY AS t(item, ord)
)
WHERE jsonb_typeof(o."items"::jsonb) = 'array';
