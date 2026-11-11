-- Products may now be saved without a name.
ALTER TABLE "products" ALTER COLUMN "title" SET DEFAULT '';

-- Per-shop product numbers. Existing products are numbered in the order
-- they were created, oldest first.
ALTER TABLE "products" ADD COLUMN "number" INTEGER;

UPDATE "products" p
SET "number" = n.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS rn
  FROM "products"
) n
WHERE p.id = n.id;

ALTER TABLE "products" ALTER COLUMN "number" SET NOT NULL;

CREATE UNIQUE INDEX "products_tenant_id_number_key" ON "products"("tenant_id", "number");

ALTER TABLE "tenants" ADD COLUMN "product_number_seq" INTEGER NOT NULL DEFAULT 0;

UPDATE "tenants" t
SET "product_number_seq" = m.max_number
FROM (SELECT tenant_id, MAX("number") AS max_number FROM "products" GROUP BY tenant_id) m
WHERE t.id = m.tenant_id;
