// Every opengraph-image.tsx route that reads tenant/product data goes
// through lib/api.ts's request(), which hardcodes `cache: "no-store"" —
// correct for the storefront pages themselves (checkout/stock/tracking
// need fresh reads), but it also means Next can never statically cache
// these OG image routes: a Request-time "uncached data" fetch anywhere in
// the render forces the whole route dynamic (see Next's fetch-caching
// docs), and a route-level `revalidate` export can't override that.
//
// So caching has to happen one level up, on the HTTP response itself —
// these headers tell Vercel's edge network (and WhatsApp/social crawlers,
// which respect Cache-Control) to reuse the generated image instead of
// re-invoking the function on every repeat hit. That's the fix for a
// shop's shared link getting fetched by a crawler far more often than a
// human actually re-generates the underlying data.
export const OG_IMAGE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
};

// For the one OG image that embeds something genuinely time-sensitive
// (order status) — still worth caching, just for a much shorter window.
export const OG_IMAGE_HEADERS_SHORT = {
  "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
};
