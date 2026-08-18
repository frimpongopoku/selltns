import { headers } from "next/headers";
import { isPlatformHost } from "./is-platform-host";

// Server Components only (uses next/headers). Tells storefront pages
// whether the current request came in on a vendor's custom domain, so they
// can build slug-free links via storeHref() instead of the platform's
// /{slug}/... convention.
export async function isCustomDomainRequest(): Promise<boolean> {
  const host = (await headers()).get("host");
  return !!host && !isPlatformHost(host);
}
