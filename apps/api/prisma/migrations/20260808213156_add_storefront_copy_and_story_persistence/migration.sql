-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "footer_tagline" TEXT NOT NULL DEFAULT 'Handmade, made-to-order pieces. Requested here, confirmed by us, paid your way.',
ADD COLUMN     "hero_tagline" TEXT NOT NULL DEFAULT 'Small-batch, handmade pieces. Request your favorites and we''ll confirm before arranging payment.',
ADD COLUMN     "story_blocks" JSONB NOT NULL DEFAULT '[]';
