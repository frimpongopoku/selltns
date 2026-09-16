// The platform's own bare hostname (no scheme, no trailing slash), e.g.
// "selltns.com" — used to build platform storefront links
// (`https://${APP_DOMAIN}/{slug}`) and to recognize "this request is for
// the platform itself" in proxy.ts/is-platform-host.ts.
//
// NEXT_PUBLIC_APP_DOMAIN is documented as a bare hostname, but nothing
// enforced that at the env-var level — a value accidentally set with a
// scheme (a pasted full URL, or the common "https//" missing-colon typo)
// silently produced broken links like "https://https//www.selltns.com/x"
// everywhere this was interpolated by hand. Normalizing once here, and
// having every call site import from this module instead of reading
// process.env directly, means a misconfigured env var degrades to "the
// scheme got stripped" instead of "every platform link across the app
// breaks."
function normalizeAppDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^[a-z][a-z0-9+.-]*\/\//i, "")
    .replace(/\/+$/, "");
}

export const APP_DOMAIN = normalizeAppDomain(process.env.NEXT_PUBLIC_APP_DOMAIN ?? "selltns.com");
