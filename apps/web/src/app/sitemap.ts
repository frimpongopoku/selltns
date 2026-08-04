import type { MetadataRoute } from "next";
import { getCollections, getProducts } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([getProducts(), getCollections()]);

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/collections`, changeFrequency: "weekly", priority: 0.8 },
    ...collections.map((c) => ({
      url: `${SITE_URL}/collections/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products
      .filter((p) => p.isActive)
      .map((p) => ({
        url: `${SITE_URL}/products/${p.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
  ];
}
