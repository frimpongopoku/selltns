import { ImageResponse } from "next/og";
import { getTenantBySlug } from "@/lib/api";

export const alt = "Payment details";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);

  const name = tenant?.name ?? "Selltns";
  const bg = tenant?.themeTokens.background ?? "#111111";
  const fg = tenant?.themeTokens.foreground ?? "#ffffff";
  const accent = tenant?.themeTokens.accent ?? "#E8C468";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          color: fg,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: accent,
            marginBottom: 28,
          }}
        >
          Payment details
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            textAlign: "center",
            padding: "0 80px",
            lineHeight: 1.15,
          }}
        >
          {name}
        </div>
      </div>
    ),
    size,
  );
}
