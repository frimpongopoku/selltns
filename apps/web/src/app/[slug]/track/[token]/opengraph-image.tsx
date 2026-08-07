import { ImageResponse } from "next/og";
import { getOrderByToken, getTenantBySlug } from "@/lib/api";
import { formatMoney } from "@/lib/format";

export const alt = "Order status";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const [tenant, order] = await Promise.all([
    getTenantBySlug(slug).catch(() => null),
    getOrderByToken(token).catch(() => null),
  ]);

  const name = tenant?.name ?? "Selltns";
  const bg = tenant?.themeTokens.background ?? "#111111";
  const fg = tenant?.themeTokens.foreground ?? "#ffffff";
  const accent = tenant?.themeTokens.accent ?? "#E8C468";
  const statusLabel = order
    ? order.status.charAt(0) + order.status.slice(1).toLowerCase()
    : "";

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
          {order ? `Order · ${statusLabel}` : "Order tracking"}
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            textAlign: "center",
            padding: "0 80px",
            lineHeight: 1.15,
          }}
        >
          {name}
        </div>
        {order && (
          <div
            style={{
              fontSize: 32,
              marginTop: 28,
              color: fg,
              opacity: 0.75,
            }}
          >
            {formatMoney(order.total)} · {order.items.length} item
            {order.items.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
    ),
    size,
  );
}
