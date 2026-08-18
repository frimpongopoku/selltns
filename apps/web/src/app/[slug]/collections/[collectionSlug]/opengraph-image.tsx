import { ImageResponse } from "next/og";
import { getCollection, getTenantBySlug } from "@/lib/api";
import { toEmbeddableImage } from "@/lib/og-image";

// sharp (used to re-encode images for Satori — see og-image.ts) needs
// Node's native module system, unavailable on the Edge runtime.
export const runtime = "nodejs";

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
  const accent = tenant?.themeTokens.accent ?? "#E8C468";
  const candidates = (collection?.products ?? [])
    .filter((p) => p.isActive && p.images[0])
    .slice(0, 4);
  const tileWidth = candidates.length > 0 ? Math.floor(size.width / candidates.length) : 0;

  const [tileImages, coverImage] = await Promise.all([
    Promise.all(candidates.map((p) => toEmbeddableImage(p.images[0], tileWidth, size.height))),
    collection?.coverImage
      ? toEmbeddableImage(collection.coverImage, size.width, size.height)
      : Promise.resolve(null),
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
        ) : coverImage ? (
          <img src={coverImage} alt="" width={size.width} height={size.height} style={{ objectFit: "cover" }} />
        ) : null}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            padding: "44px 56px",
            background: "linear-gradient(0deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0) 100%)",
          }}
        >
          <div style={{ display: "flex", fontSize: 18, letterSpacing: 4, textTransform: "uppercase", color: accent }}>
            {tenant?.name ?? "Collection"}
          </div>
          <div style={{ display: "flex", fontSize: 50, fontWeight: 700, color: "#ffffff", marginTop: 8 }}>
            {title}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
