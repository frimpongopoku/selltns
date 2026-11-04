-- Gallery photos already sent to the Photo Drop take their gallery focus.
UPDATE "drop_photos" AS dp
SET "focus_x" = ma."focus_x", "focus_y" = ma."focus_y"
FROM "media_assets" AS ma
WHERE dp."media_asset_id" = ma."id"
  AND dp."focus_x" IS NULL
  AND ma."focus_x" IS NOT NULL;
