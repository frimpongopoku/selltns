-- New products used to be appended to the end of display_order, so catalogs
-- read oldest-first. They're now inserted at the top. Flip existing catalogs
-- to newest-first too, but only for tenants whose order is still the default
-- (display_order matches creation order) — anyone who manually reordered
-- with the up/down arrows keeps the arrangement they chose.
WITH ranked AS (
  SELECT
    "id",
    "tenant_id",
    ROW_NUMBER() OVER (
      PARTITION BY "tenant_id" ORDER BY "display_order", "id"
    ) AS by_order,
    ROW_NUMBER() OVER (
      PARTITION BY "tenant_id" ORDER BY "created_at", "id"
    ) AS by_created,
    ROW_NUMBER() OVER (
      PARTITION BY "tenant_id" ORDER BY "created_at" DESC, "id" DESC
    ) - 1 AS newest_first
  FROM "products"
),
untouched AS (
  SELECT "tenant_id"
  FROM ranked
  GROUP BY "tenant_id"
  HAVING bool_and(by_order = by_created)
)
UPDATE "products" AS p
SET "display_order" = r.newest_first
FROM ranked r
JOIN untouched u ON u."tenant_id" = r."tenant_id"
WHERE p."id" = r."id";
