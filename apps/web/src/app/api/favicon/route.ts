import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTenantBySlug } from "@/lib/api";

// Bare, slug-free route (under /api, so proxy.ts's custom-domain matcher
// skips it entirely — no risk of the double-slug-prefix rewrite bug). The
// tenant is identified by the ?slug= query param rather than the request
// host, so this resolves identically on selltns.com and on a connected
// custom domain. Only ever linked to when a tenant has a logo — see
// generateMetadata in app/[slug]/layout.tsx.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const tenant = slug ? await getTenantBySlug(slug).catch(() => null) : null;
  if (!tenant?.logoUrl) {
    return new NextResponse(null, { status: 404 });
  }

  const upstream = await fetch(tenant.logoUrl).catch(() => null);
  if (!upstream?.ok || !upstream.body) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
