import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth-constants";
import { isPlatformHost } from "@/lib/is-platform-host";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

function handleAdminAuth(request: NextRequest) {
  const isLoggedIn = request.cookies.has(ADMIN_SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname === "/admin/access-denied") {
    if (isLoggedIn && pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

// Rewrites (never redirects) a verified vendor custom domain to its
// storefront's normal path-based URL, e.g. mintsui.com/tote -> /akosua/tote.
// Any failure here — unknown host, unreachable API, not-yet-verified domain
// — falls through to NextResponse.next() so a broken/misconfigured custom
// domain never turns into a broken page; selltns.com/{slug} always works
// regardless of this lookup's outcome.
async function handleCustomDomainRewrite(request: NextRequest) {
  const host = request.headers.get("host");
  if (!host || isPlatformHost(host)) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(`${API_URL}/tenants/by-custom-domain/${host}`);
    if (!res.ok) {
      return NextResponse.next();
    }
    const { slug } = (await res.json()) as { slug: string };
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  } catch {
    return NextResponse.next();
  }
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return handleAdminAuth(request);
  }
  return handleCustomDomainRewrite(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes / Route Handlers)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
