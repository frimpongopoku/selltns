import { ImageResponse } from "next/og";
import { getTenantBySlug } from "@/lib/api";

// Only ever rendered as a fallback — when a tenant has a logo,
// generateMetadata in page.tsx supplies that as the OG image directly and
// Next skips this file entirely for that request. So this never has a
// photo to work with by design, not just by circumstance: no embedded
// images here, ever, which is deliberate — next/og's Satori renderer
// can't reliably composite a fetched remote image (WebP especially, which
// is what every upload on this platform becomes), so keeping this file
// pure typography/gradients sidesteps that whole class of failure.
export const alt = "Storefront";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fit a wide range of store names into one composition without ever
// overflowing or looking sparse — a two-word name and a five-word one
// should both look intentional.
function fontSizeFor(name: string): number {
  if (name.length <= 10) return 108;
  if (name.length <= 16) return 88;
  if (name.length <= 24) return 68;
  return 52;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);

  const name = tenant?.name ?? "Selltns";
  const bg = tenant?.themeTokens.background ?? "#111111";
  const fg = tenant?.themeTokens.foreground ?? "#ffffff";
  const accent = tenant?.themeTokens.accent ?? "#E8C468";
  const initial = name.trim().charAt(0).toUpperCase() || "S";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          alignItems: "center",
          backgroundColor: bg,
          color: fg,
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -70,
            top: -140,
            display: "flex",
            fontSize: 620,
            fontWeight: 800,
            lineHeight: 1,
            color: accent,
            opacity: 0.14,
          }}
        >
          {initial}
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "0 88px", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: accent,
              marginBottom: 26,
            }}
          >
            Shop now
          </div>
          <div
            style={{
              display: "flex",
              fontSize: fontSizeFor(name),
              fontWeight: 800,
              lineHeight: 1.08,
              maxWidth: 880,
            }}
          >
            {name}
          </div>
          {tenant?.verificationStatus === "VERIFIED" && (
            <div
              style={{
                display: "flex",
                marginTop: 30,
                width: "fit-content",
                fontSize: 20,
                color: accent,
                border: `2px solid ${accent}`,
                borderRadius: 999,
                padding: "6px 20px",
              }}
            >
              ✓ Verified
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
