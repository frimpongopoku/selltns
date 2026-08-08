import type { Tenant } from "./types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";

// A tenant's canonical URL is its verified custom domain once it has one;
// otherwise the platform path (selltns.com/{slug}) — same rule already used
// for the "live at" line in site-footer.tsx, centralized here so every
// generateMetadata can point `alternates.canonical` at the one true URL.
export function getCanonicalUrl(tenant: Tenant, path = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  if (tenant.customDomain && tenant.domainVerified) {
    return `https://${tenant.customDomain}${suffix}`;
  }
  return `${SITE_URL}/${tenant.slug}${suffix}`;
}
