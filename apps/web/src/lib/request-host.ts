import { headers } from "next/headers";
import { CUSTOM_DOMAIN_HEADER } from "./custom-domain-header";

// Server Components only (uses next/headers). Tells storefront pages
// whether the current request came in on a vendor's custom domain, so they
// can build slug-free links via storeHref() instead of the platform's
// /{slug}/... convention. Trusts proxy.ts's determination (stamped as a
// request header once it's confirmed a genuine tenant match) rather than
// re-deriving it here — see custom-domain-header.ts for why.
export async function isCustomDomainRequest(): Promise<boolean> {
  return (await headers()).get(CUSTOM_DOMAIN_HEADER) === "1";
}
