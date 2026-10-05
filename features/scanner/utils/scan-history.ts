import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeScanContent } from "@/services/scan-history/dedup";

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
 * If the user has already scanned this QR code, the previous entry is replaced so the
 * item moves to the top with the latest scan data, preventing duplicate cards.
 * Caps the list at 100 entries. Fire-and-forget safe.
 */
export async function appendToLocalScanHistory(
  userId: string,
  entry: LocalScanEntry
): Promise<void> {
  const historyKey = `local_scan_history_${userId}`;
  try {
    const stored = await AsyncStorage.getItem(historyKey);
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
    await AsyncStorage.setItem(historyKey, JSON.stringify(filtered));
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
