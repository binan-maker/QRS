import { db } from "@/lib/db/client";

export interface ScanEvent {
  platform: "android" | "ios" | "web" | "unknown";
  contentType: string;
  verdict: "safe" | "flagged" | "unknown";
  scanSource: "camera" | "gallery" | "unknown";
  /** ISO 3166-1 alpha-2 country code derived from device locale — non-PII */
  country: string;
}

function _getCountryCode(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const parts = locale.split("-");
    if (parts.length < 2) return "unknown";
    const tag = parts[parts.length - 1].toUpperCase();
    return /^[A-Z]{2}$/.test(tag) ? tag : "unknown";
  } catch {
    return "unknown";
  }
}

export async function recordScanEvent(qrId: string, event: ScanEvent): Promise<void> {
  try {
    await db.add(["qrCodes", qrId, "events"], {
      ...event,
      timestamp: db.timestamp(),
    });
  } catch {
    // Intentionally silent — analytics loss is preferable to scan UX breakage.
  }
}

export function emitScanEvent(qrId: string, opts: Omit<ScanEvent, "country">): void {
  recordScanEvent(qrId, { ...opts, country: _getCountryCode() }).catch(() => {});
}
