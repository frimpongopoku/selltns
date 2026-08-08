import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

function remotePatternFor(rawUrl: string | undefined): RemotePattern | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || undefined,
    };
  } catch {
    return null;
  }
}

const remotePatterns: RemotePattern[] = [
  { protocol: "https", hostname: "images.unsplash.com" },
  // YouTube video thumbnails, shown for product videos.
  { protocol: "https", hostname: "img.youtube.com" },
  // Cloudflare R2 in production.
  remotePatternFor(process.env.NEXT_PUBLIC_MEDIA_BASE_URL),
  // The API's local-disk storage fallback, used when R2 isn't configured —
  // see apps/api/src/media/storage/local-disk-storage.service.ts.
  remotePatternFor(process.env.NEXT_PUBLIC_API_URL),
].filter((p): p is RemotePattern => p !== null);

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    // Next blocks the image optimizer from fetching upstream hosts that
    // resolve to a loopback/private IP (SSRF guard) — that includes
    // localhost, which is exactly where the API's local-disk storage
    // fallback serves uploads from in dev. Only relevant outside
    // production, and only when NEXT_PUBLIC_API_URL points at a local host.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  async redirects() {
    return [
      { source: "/demo", destination: "/akosua", permanent: false },
      { source: "/demo/:path*", destination: "/akosua/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
