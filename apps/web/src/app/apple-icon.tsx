import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #14C088 0%, #0B7A56 100%)",
          borderRadius: 40,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 108,
            fontWeight: 800,
            fontFamily: "sans-serif",
            letterSpacing: "-0.03em",
            marginTop: -6,
          }}
        >
          S
        </span>
      </div>
    ),
    { ...size },
  );
}
