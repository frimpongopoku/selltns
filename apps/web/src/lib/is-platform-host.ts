const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "selltns.com";

// Hosts that are always the platform itself, never a vendor's custom
// domain. Shared by proxy.ts (custom-domain rewrite) and sitemap.ts/
// robots.ts (deciding whether to scope to one tenant or list them all).
export function isPlatformHost(host: string): boolean {
  const hostname = host.split(":")[0];
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".vercel.app") ||
    hostname === APP_DOMAIN ||
    hostname.endsWith(`.${APP_DOMAIN}`)
  );
}
