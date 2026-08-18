import { ImageResponse } from "next/og";
import { getProducts, getTenantBySlug } from "@/lib/api";

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
  //
  // NOTE: Satori (what ImageResponse renders through) can't reliably
  // decode WebP — our own upload pipeline's output format — so a WebP
  // product/logo photo currently renders as a blank tile here rather than
  // the actual photo, though it no longer crashes the route. A prior
  // attempt re-encoded these to JPEG server-side via `sharp`, but sharp's
  // native binary failed to load in the Vercel Linux runtime and took the
  // whole route down — reverted. Needs a non-native re-encoding approach
  // (e.g. a WASM decoder, or proxying through Next's own image optimizer)
  // before product photos will reliably show here again.
  const featured = products.filter((p) => p.isActive && p.images[0]).slice(0, 4);
  const tileWidth = featured.length > 0 ? Math.floor(size.width / featured.length) : 0;

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
        {featured.length > 0 ? (
          featured.map((p) => (
            <img
              key={p.id}
              src={p.images[0]}
              alt=""
              width={tileWidth}
              height={size.height}
              style={{ objectFit: "cover" }}
            />
          ))
        ) : tenant?.logoUrl ? (
          <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
            <img
              src={tenant.logoUrl}
              alt=""
              width={280}
              height={280}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
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
          {tenant?.logoUrl && featured.length > 0 && (
            <img
              src={tenant.logoUrl}
              alt=""
              width={60}
              height={60}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
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
