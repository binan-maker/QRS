import { ImageResponse } from "next/og";

export const alt = "BinRo — Know before you open";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px 84px",
          background: "#f4f7fd",
          color: "#101827",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 92, height: 92, border: "2px solid #a5c5f2", borderRadius: 24, background: "#dceaff", color: "#075dcc", fontSize: 54, fontWeight: 700 }}>⌗</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#075dcc", fontSize: 46, fontWeight: 700, letterSpacing: -2 }}>BinRo</div>
            <div style={{ color: "#566a83", fontSize: 22 }}>Know before you open</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
          <div style={{ color: "#075dcc", fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>PUBLIC QR VERIFICATION</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 54, lineHeight: 1.08, fontWeight: 700, letterSpacing: -2 }}>
            <span>Check the destination.</span>
            <span>Understand the trust signal.</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#8190a1", fontSize: 20 }}>Community signals • Destination preview • Safer decisions</div>
      </div>
    ),
    size,
  );
}