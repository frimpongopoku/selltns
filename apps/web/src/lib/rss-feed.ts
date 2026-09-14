import { getCanonicalUrl } from "./canonical";
import { formatMoney } from "./format";
import { discountedPrice, isOnSale } from "./pricing";
import type { Product, Tenant } from "./types";

// A plain RSS 2.0 feed — deliberately NOT the Google Merchant/Pinterest
// Catalog XML format (the xmlns:g one meant for Pinterest's Shopping/
// Catalogs feature, which is gated to a shortlist of countries Ghana
// isn't confirmed to be on). This targets Pinterest's separate,
// market-independent "auto-publish Pins from your RSS feed" feature
// instead — https://help.pinterest.com/en/business/article/auto-publish-pins-from-your-rss-feed —
// which reads plain <title>/<description>/<link>/<enclosure> per <item>
// and works for any claimed website. If Pinterest Shopping later opens up
// for Ghana, a proper g:-namespaced catalog feed is a natural, separate
// addition alongside this one, not a replacement for it.

export interface FeedItemInput {
  id: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string | null;
  /** ISO date string — becomes <pubDate>. Pinterest publishes oldest-first. */
  publishedAt: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function imageMimeType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

export function renderRssFeed(params: {
  title: string;
  link: string;
  description: string;
  items: FeedItemInput[];
}): string {
  const itemsXml = params.items
    .map((item) => {
      const enclosure = item.imageUrl
        ? `      <enclosure url="${escapeXml(item.imageUrl)}" type="${imageMimeType(item.imageUrl)}" length="0" />\n`
        : "";
      return (
        `    <item>\n` +
        `      <title>${escapeXml(item.title)}</title>\n` +
        `      <link>${escapeXml(item.link)}</link>\n` +
        `      <guid isPermaLink="false">${escapeXml(item.id)}</guid>\n` +
        `      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>\n` +
        `      <description>${escapeXml(item.description)}</description>\n` +
        enclosure +
        `    </item>`
      );
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0">\n` +
    `  <channel>\n` +
    `    <title>${escapeXml(params.title)}</title>\n` +
    `    <link>${escapeXml(params.link)}</link>\n` +
    `    <description>${escapeXml(params.description)}</description>\n` +
    `    <language>en</language>\n` +
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n` +
    `${itemsXml}\n` +
    `  </channel>\n` +
    `</rss>\n`
  );
}

// Leads with price (and the sale price when there is one) the same way
// generateMetadata's social-share description already does for a product
// page — genuinely useful context on a Pin, not just decoration.
export function feedItemFromProduct(tenant: Tenant, product: Product): FeedItemInput {
  const priceLine = isOnSale(product)
    ? `Now ${formatMoney(discountedPrice(product))} (was ${formatMoney(product.price)}) — `
    : `${formatMoney(product.price)} — `;
  return {
    id: product.id,
    title: product.title,
    description: `${priceLine}${product.description}`,
    link: getCanonicalUrl(tenant, `/products/${product.slug}`),
    imageUrl: product.images[0] ?? null,
    publishedAt: product.createdAt,
  };
}
