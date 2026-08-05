import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";

// Per-tenant storefront pages aren't enumerated here — with multiple
// vendors now live at their own /[slug], a proper sitemap would need a
// public "list stores" endpoint (or a per-store sitemap) that doesn't
// exist yet. Only the platform's own static pages are listed for now.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
