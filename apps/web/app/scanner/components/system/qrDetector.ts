"use client";

import jsQRModule from "jsqr";

let jsQrInstance: typeof jsQRModule | null =
  typeof jsQRModule === "function" ? jsQRModule : ((jsQRModule as any)?.default ?? null);

export async function loadJsQr(): Promise<typeof jsQRModule | null> {
  if (typeof jsQrInstance === "function") return jsQrInstance;
  try {
    const mod = await import("jsqr");
    jsQrInstance = typeof mod === "function" ? mod : ((mod as any)?.default ?? mod);
  } catch {}
  return jsQrInstance;
}

export function isValidDecodedQr(str: unknown): str is string {
  if (typeof str !== "string") return false;
  const trimmed = str.trim();
  if (trimmed.length < 2) return false;
  if (/^(tel|sms|smsto|mailto|http|https|geo|wifi):?$/i.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("tel:") && trimmed.replace(/^tel:/i, "").trim().length < 3) return false;
  if (lower.startsWith("sms:") && trimmed.replace(/^sms:/i, "").trim().length < 3) return false;
  if (lower.startsWith("mailto:") && !trimmed.includes("@")) return false;
  return true;
}

export async function detectQrFromCanvas(
  ctx: CanvasRenderingContext2D, width: number, height: number
): Promise<{ data: string; bounds?: any } | null> {
  // 1. Native BarcodeDetector if available
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const barcodes = await detector.detect(ctx.canvas);
      if (barcodes?.[0]?.rawValue && isValidDecodedQr(barcodes[0].rawValue)) {
        return { data: barcodes[0].rawValue, bounds: barcodes[0].boundingBox };
      }
    } catch {}
  }

  // 2. jsQR fallback
  const jsqr = await loadJsQr();
  if (!jsqr) return null;
  const imgData = ctx.getImageData(0, 0, width, height);
  const code = jsqr(imgData.data, width, height, { inversionAttempts: "attemptBoth" });
  if (code?.data && isValidDecodedQr(code.data)) {
    return { data: code.data, bounds: code.location };
  }
  return null;
}
