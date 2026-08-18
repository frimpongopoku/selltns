// Shared between proxy.ts (sets it after confirming a request's Host header
// matches a tenant's verified custom domain) and request-host.ts (reads it
// in Server Components). This is the single source of truth for "is this
// request on a connected custom domain" — Server Components must not
// re-derive that independently via isPlatformHost(), since that only
// checks whether the host fails to match the platform's own domain, and
// silently misfires as "custom domain" for anything that doesn't match —
// including the platform's own domain itself if NEXT_PUBLIC_APP_DOMAIN
// ever drifts from the real production hostname. The middleware already
// confirms a genuine tenant match via the by-custom-domain API before
// treating a request as a custom domain; everything downstream should
// trust that one determination instead of re-guessing.
export const CUSTOM_DOMAIN_HEADER = "x-selltns-custom-domain";
