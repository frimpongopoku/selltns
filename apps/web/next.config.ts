import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import packageJson from "./package.json";

// A real, ever-increasing integer — total commit count on the branch being
// built — rather than an opaque hash. Resolved once, at build time, in
// this file's own Node process (never bundled into app code, so shelling
// out to git here is safe). Requires full git history, not a shallow
// clone; falls back to "" (hidden in the UI) if that's ever unavailable
// rather than showing a misleading count.
function resolveBuildNumber(): string {
  try {
    return execSync("git rev-list --count HEAD", { cwd: __dirname }).toString().trim();
  } catch {
    return "";
  }
}

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
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_NUMBER: resolveBuildNumber(),
  },
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
