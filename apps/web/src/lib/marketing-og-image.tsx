export const marketingOgImageSize = { width: 1200, height: 630 };
export const marketingOgImageAlt =
  "Selltns — sell online, get paid by Mobile Money or bank";

export function MarketingOgImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 96px",
        background: "#F8F8F6",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -140,
          right: -140,
          width: 480,
          height: 480,
          borderRadius: 480,
          background: "linear-gradient(135deg, #14C088 0%, #0B7A56 100%)",
          opacity: 0.16,
        }}
      />
      <p
        style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#0E9F6E",
          margin: 0,
        }}
      >
        Built for Ghanaian sellers
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 22,
            background: "linear-gradient(135deg, #14C088 0%, #0B7A56 100%)",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 58,
              fontWeight: 800,
              fontFamily: "sans-serif",
            }}
          >
            S
          </span>
        </div>
        <span
          style={{
            fontSize: 88,
            fontWeight: 800,
            color: "#141414",
            letterSpacing: "-0.02em",
          }}
        >
          Selltns
        </span>
      </div>
      <p
        style={{
          fontSize: 36,
          color: "#66605A",
          marginTop: 28,
          maxWidth: 820,
        }}
      >
        Sell online, get paid by Mobile Money or bank — no card fees, no
        developer needed.
      </p>
    </div>
  );
}
