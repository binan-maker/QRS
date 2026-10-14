import { normalizeScanContent } from "@services/scan-history/dedup";

export interface LocalScanEntry {
  id:          string;
  content:     string;
  contentType: string;
  scannedAt:   string;
  qrCodeId:    string;
  offline?:    boolean;
}

/**
 * Prepend a scan entry to the user's local scan history (YouTube watch-history semantics).
 * Replaces any existing entry of the same QR code so the latest scan moves to the top
 * without creating duplicate cards.
 * Caps the list at 100 entries. Fire-and-forget safe.
 * 1:1 with features/scanner/utils/scan-history.ts
 */
export async function appendToLocalScanHistory(
  userId?: string | null,
  entry?: LocalScanEntry
): Promise<void> {
  if (typeof window === "undefined" || !entry) return;

  try {
    const keys = userId
      ? [`local_scan_history_${userId}`, "binro_recent_scans", "local_scan_history", "binro_scan_history"]
      : ["binro_recent_scans", "local_scan_history", "binro_scan_history"];

    for (const historyKey of keys) {
      const stored = localStorage.getItem(historyKey);
      const history: LocalScanEntry[] = stored ? JSON.parse(stored) : [];

      // Remove any older duplicate entry for the same QR code or destination
      const normEntryContent = normalizeScanContent(entry.content);
      const filtered = history.filter((item) => {
        if (entry.qrCodeId && item.qrCodeId && entry.qrCodeId === item.qrCodeId) return false;
        if (normEntryContent && item.content && normalizeScanContent(item.content) === normEntryContent) return false;
        return true;
      });

      filtered.unshift(entry);
      if (filtered.length > 100) filtered.pop();
      localStorage.setItem(historyKey, JSON.stringify(filtered));
    }

    // Notify active tabs and pages immediately so history & recent scans update in real-time
    try {
      window.dispatchEvent(new CustomEvent("binro:scan_added", { detail: entry }));
    } catch {}
  } catch {}
}

export function makeScanEntry(
  content:     string,
  contentType: string,
  qrCodeId:    string,
  offline?:    boolean
): LocalScanEntry {
  return {
    id:          Date.now().toString() + Math.random().toString(36).slice(2, 9),
    content,
    contentType,
    scannedAt:   new Date().toISOString(),
    qrCodeId,
    ...(offline ? { offline: true } : {}),
  };
}
