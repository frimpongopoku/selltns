import { NextResponse } from "next/server";
import { getCollection, getTenantBySlug } from "@/lib/api";
import { getCanonicalUrl } from "@/lib/canonical";
import { feedItemFromProduct, renderRssFeed } from "@/lib/rss-feed";

// One collection, one feed — the intended mapping onto Pinterest's
// "auto-publish Pins from your RSS feed": each collection's feed URL gets
// registered against its own board, so "New Arrivals" pins land on a
// New Arrivals board instead of everything landing in one place.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; collectionSlug: string }> },
) {
  const { slug, collectionSlug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant || tenant.suspended) {
    return new NextResponse(null, { status: 404 });
  }

  const collection = await getCollection(collectionSlug, tenant.id, true).catch(() => null);
  if (!collection || !collection.isActive) {
    return new NextResponse(null, { status: 404 });
  }

  const activeProducts = collection.products.filter((p) => p.isActive);

  const xml = renderRssFeed({
    title: `${tenant.name} — ${collection.title}`,
    link: getCanonicalUrl(tenant, `/collections/${collection.slug}`),
    description:
      collection.description || `${collection.title} from ${tenant.name}, on Selltns.`,
    items: activeProducts.map((product) => feedItemFromProduct(tenant, product)),
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
