import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Same-origin proxy for our own media (product/collection photos) — needed
// so canvas-based exports (collection flyers, fulfillment labels) can load
// them with crossOrigin="anonymous" and read pixels back out. The R2
// public domain these are served from sends no CORS headers, so a direct
// load fails silently; see the same rationale on /api/favicon.
//
// Only ever proxies a URL whose origin matches one of the hosts this app
// already trusts for next/image — the same remotePatterns list in
// next.config.ts (R2 media bucket, the API's local storage fallback in
// dev, Unsplash fixture photos, YouTube thumbnails) — never an arbitrary
// caller-supplied host, so this can't be used as an open SSRF relay.
function allowedOrigins(): string[] {
  return [
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    "https://images.unsplash.com",
    "https://img.youtube.com",
  ]
    .filter((v): v is string => !!v)
    .map((v) => {
      try {
        return new URL(v).origin;
      } catch {
        return null;
      }
    })
    .filter((v): v is string => !!v);
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return new NextResponse(null, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new NextResponse(null, { status: 400 });
  }
  if (!allowedOrigins().includes(target.origin)) {
    return new NextResponse(null, { status: 403 });
  }

  const upstream = await fetch(target).catch(() => null);
  if (!upstream?.ok || !upstream.body) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
