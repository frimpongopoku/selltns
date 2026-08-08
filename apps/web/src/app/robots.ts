import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");
  const isLocal = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");
  const sitemapUrl = host
    ? `${isLocal ? "http" : "https"}://${host}/sitemap.xml`
    : `${SITE_URL}/sitemap.xml`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /admin: never public. /api: internal route handlers, not content.
        // /*/cart, /*/checkout, /*/track: per-session/transactional pages —
        // no SEO value and would otherwise show up as thin duplicate content.
        disallow: ["/admin", "/api", "/*/cart", "/*/checkout", "/*/track"],
      },
    ],
    sitemap: sitemapUrl,
  };
}
