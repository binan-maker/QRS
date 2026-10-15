import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BinRo QR Inspection";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

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
          backgroundColor: "#0C1525",
          backgroundImage: "linear-gradient(135deg, #0C1525 0%, #001f4d 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "48px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: "48px",
            fontWeight: 800,
            marginBottom: "24px",
          }}
        >
          Bin<span style={{ color: "#3B82F6" }}>Ro</span>
        </div>
        <div
          style={{
            fontSize: "28px",
            fontWeight: 600,
            color: "#94a3b8",
            marginBottom: "12px",
          }}
        >
          Know Before You Scan
        </div>
        <div
          style={{
            fontSize: "20px",
            color: "#60a5fa",
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            padding: "8px 24px",
            borderRadius: "9999px",
            border: "1px solid rgba(59, 130, 246, 0.3)",
          }}
        >
          Code: {code}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
