// Builds a link to another page within a tenant's storefront. `path` is the
// slug-relative path (e.g. "/products/tote-bag", "" for the home page).
//
// On the shared selltns.com host, storefront pages live under /{slug}/... —
// so the slug has to be prefixed onto the path. On a connected custom
// domain, the tenant's storefront is served at the domain root instead
// (proxy.ts rewrites every request there to /{slug}/... internally, on the
// server, invisibly to the browser) — so a link built with the slug prefix
// would send the browser to a URL the rewrite then prefixes a second time,
// producing /{slug}/{slug}/... and a 404. Links must stay bare there.
export function storeHref(
  slug: string,
  isCustomDomain: boolean,
  path = "",
): string {
  if (isCustomDomain) return path || "/";
  return `/${slug}${path}`;
}
