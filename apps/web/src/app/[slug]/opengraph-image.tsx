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
  const fg = tenant?.themeTokens.foreground ?? "#ffffff";
  const accent = tenant?.themeTokens.accent ?? "#E8C468";
  const ownerLine =
    tenant?.ownerInfoVisible && tenant.ownerDisplayName
      ? `By ${tenant.ownerDisplayName}${tenant.ownerTitle ? ` · ${tenant.ownerTitle}` : ""}`
      : null;
  const featured = products.filter((p) => p.isActive && p.images[0]).slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: bg,
          color: fg,
          fontFamily: "sans-serif",
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            {tenant?.logoUrl && (
              <img
                src={tenant.logoUrl}
                alt=""
                width={84}
                height={84}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
                {tenant?.verificationStatus === "VERIFIED" && (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 18,
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
              {ownerLine && (
                <div style={{ display: "flex", fontSize: 24, opacity: 0.75, marginTop: 8 }}>
                  {ownerLine}
                </div>
              )}
            </div>
          </div>
          {tenant?.heroTagline && (
            <div style={{ display: "flex", fontSize: 26, opacity: 0.85, marginTop: 30, maxWidth: 960, lineHeight: 1.4 }}>
              {tenant.heroTagline}
            </div>
          )}
        </div>

        {featured.length > 0 && (
          <div style={{ display: "flex", gap: 22 }}>
            {featured.map((p) => (
              <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 190 }}>
                <img
                  src={p.images[0]}
                  alt=""
                  width={190}
                  height={190}
                  style={{ borderRadius: 16, objectFit: "cover" }}
                />
                <div style={{ display: "flex", fontSize: 20, marginTop: 10, opacity: 0.9 }}>
                  {p.title.length > 22 ? `${p.title.slice(0, 22)}…` : p.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    size,
  );
}
