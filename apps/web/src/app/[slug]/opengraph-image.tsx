import { ImageResponse } from "next/og";
import { getProducts, getTenantBySlug } from "@/lib/api";
import { toEmbeddableImage } from "@/lib/og-image";

// sharp (used to re-encode images for Satori — see og-image.ts) needs
// Node's native module system, unavailable on the Edge runtime.
export const runtime = "nodejs";

export const alt = "Storefront";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  const products = tenant ? await getProducts(tenant.id).catch(() => []) : [];

  const name = tenant?.name ?? "Selltns";
  const bg = tenant?.themeTokens.background ?? "#111111";
  const accent = tenant?.themeTokens.accent ?? "#E8C468";
  // Image-first: a handful of product photos filling the whole canvas, with
  // just the store name as a caption — not the store name, owner credit,
  // tagline, AND per-product captions all crammed into one 1200x630 frame.
  const candidates = products.filter((p) => p.isActive && p.images[0]).slice(0, 4);
  const tileWidth = candidates.length > 0 ? Math.floor(size.width / candidates.length) : 0;

  const [tileImages, logoImage] = await Promise.all([
    Promise.all(candidates.map((p) => toEmbeddableImage(p.images[0], tileWidth, size.height))),
    tenant?.logoUrl ? toEmbeddableImage(tenant.logoUrl, 280, 280) : Promise.resolve(null),
  ]);
  const tiles = tileImages.filter((src): src is string => !!src);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: bg,
          fontFamily: "sans-serif",
        }}
      >
        {tiles.length > 0 ? (
          tiles.map((src, i) => (
            <img key={i} src={src} alt="" width={tileWidth} height={size.height} style={{ objectFit: "cover" }} />
          ))
        ) : logoImage ? (
          <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
            <img src={logoImage} alt="" width={280} height={280} style={{ borderRadius: "50%", objectFit: "cover" }} />
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "44px 56px",
            background: "linear-gradient(0deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0) 100%)",
          }}
        >
          {logoImage && tiles.length > 0 && (
            <img src={logoImage} alt="" width={60} height={60} style={{ borderRadius: "50%", objectFit: "cover" }} />
          )}
          <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: "#ffffff" }}>{name}</div>
          {tenant?.verificationStatus === "VERIFIED" && (
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: accent,
                border: `2px solid ${accent}`,
                borderRadius: 999,
                padding: "4px 14px",
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
