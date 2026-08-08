import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  getCollections,
  getProducts,
  getPublicTenantDirectory,
  getStoryBlocks,
  getTenantBySlug,
} from "@/lib/api";
import { meaningfulStoryBlocks } from "@/lib/story";
import { getCanonicalUrl } from "@/lib/canonical";
import { isPlatformHost } from "@/lib/is-platform-host";
import type { Tenant } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

async function tenantEntries(tenant: Tenant): Promise<MetadataRoute.Sitemap> {
  const [products, collections, storyBlocks] = await Promise.all([
    getProducts(tenant.id).catch(() => []),
    getCollections(tenant.id).catch(() => []),
    getStoryBlocks(tenant.id).catch(() => []),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: getCanonicalUrl(tenant), changeFrequency: "weekly", priority: 1 },
    { url: getCanonicalUrl(tenant, "/collections"), changeFrequency: "weekly", priority: 0.7 },
  ];
  if (meaningfulStoryBlocks(storyBlocks).length > 0) {
    entries.push({
      url: getCanonicalUrl(tenant, "/story"),
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }
  for (const collection of collections.filter((c) => c.isActive)) {
    entries.push({
      url: getCanonicalUrl(tenant, `/collections/${collection.slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  for (const product of products.filter((p) => p.isActive)) {
    entries.push({
      url: getCanonicalUrl(tenant, `/products/${product.slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host");

  // A verified custom domain gets a sitemap scoped to just that store.
  if (host && !isPlatformHost(host)) {
    try {
      const res = await fetch(`${API_URL}/tenants/by-custom-domain/${host}`);
      if (res.ok) {
        const { slug } = (await res.json()) as { slug: string };
        const tenant = await getTenantBySlug(slug);
        return tenantEntries(tenant);
      }
    } catch {
      // Unknown/unreachable host — fall through to the platform sitemap.
    }
  }

  // Platform host: static pages, plus every tenant not yet on a verified
  // custom domain (those are covered by their own sitemap above instead).
  const directory = await getPublicTenantDirectory().catch(() => []);
  const perTenant = await Promise.all(directory.map(tenantEntries));

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.5 },
    ...perTenant.flat(),
  ];
}
