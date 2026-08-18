import { ImageResponse } from "next/og";
import { getCollection, getTenantBySlug } from "@/lib/api";

export const alt = "Collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; collectionSlug: string }>;
}) {
  const { slug, collectionSlug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  const collection = tenant
    ? await getCollection(collectionSlug, tenant.id).catch(() => null)
    : null;

  const title = collection?.title ?? tenant?.name ?? "Selltns";
  const bg = tenant?.themeTokens.background ?? "#111111";
  const fg = tenant?.themeTokens.foreground ?? "#ffffff";
  const accent = tenant?.themeTokens.accent ?? "#E8C468";
  const featured = (collection?.products ?? [])
    .filter((p) => p.isActive && p.images[0])
    .slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: bg,
          color: fg,
          fontFamily: "sans-serif",
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: accent }}>
          {tenant?.name ?? "Collection"}
        </div>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 700, lineHeight: 1.15, marginTop: 10, marginBottom: 34 }}>
          {title}
        </div>

        {featured.length > 0 ? (
          <div style={{ display: "flex", gap: 20, flex: 1 }}>
            {featured.map((p) => (
              <div key={p.id} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <img
                  src={p.images[0]}
                  alt=""
                  style={{ width: "100%", height: 320, objectFit: "cover", borderRadius: 18 }}
                />
                <div style={{ display: "flex", justifyContent: "center", fontSize: 20, marginTop: 12, opacity: 0.9 }}>
                  {p.title.length > 20 ? `${p.title.slice(0, 20)}…` : p.title}
                </div>
              </div>
            ))}
          </div>
        ) : collection?.coverImage ? (
          <img
            src={collection.coverImage}
            alt=""
            style={{ width: "100%", flex: 1, objectFit: "cover", borderRadius: 18 }}
          />
        ) : null}
      </div>
    ),
    size,
  );
}
