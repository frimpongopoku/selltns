import { NextResponse } from "next/server";
import { getProducts, getTenantBySlug } from "@/lib/api";
import { getCanonicalUrl } from "@/lib/canonical";
import { feedItemFromProduct, renderRssFeed } from "@/lib/rss-feed";

// A site-wide RSS feed of every live product — same underlying data
// (including any active affiliate-resold items) as the storefront's own
// home page grid, since that's what a Pin should actually lead to. See
// rss-feed.ts for why this is plain RSS rather than a Pinterest Catalog.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant || tenant.suspended) {
    return new NextResponse(null, { status: 404 });
  }

  const products = await getProducts(tenant.id, true).catch(() => []);
  const activeProducts = products.filter((p) => p.isActive);

  const xml = renderRssFeed({
    title: `${tenant.name} — Products`,
    link: getCanonicalUrl(tenant),
    description:
      tenant.heroTagline || tenant.footerTagline || `Shop ${tenant.name} on Selltns.`,
    items: activeProducts.map((product) => feedItemFromProduct(tenant, product)),
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
