import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LocalScanEntry {
  id:          string;
  content:     string;
  contentType: string;
  scannedAt:   string;
  qrCodeId:    string;
  scanSource:  "camera" | "gallery";
  offline?:    boolean;
}

/**
 * Prepend a scan entry to the user's local scan history.
 * Caps the list at 100 entries. Fire-and-forget safe.
 */
export async function appendToLocalScanHistory(
  userId: string,
  entry: LocalScanEntry
): Promise<void> {
  const historyKey = `local_scan_history_${userId}`;
  try {
    const stored  = await AsyncStorage.getItem(historyKey);
    const history: LocalScanEntry[] = stored ? JSON.parse(stored) : [];
    history.unshift(entry);
    if (history.length > 100) history.pop();
    await AsyncStorage.setItem(historyKey, JSON.stringify(history));
  } catch {}
}

export function makeScanEntry(
  content:     string,
  contentType: string,
  qrCodeId:    string,
  scanSource:  "camera" | "gallery",
  offline?:    boolean
): LocalScanEntry {
  return {
    id:          Date.now().toString() + Math.random().toString(36).slice(2, 9),
    content,
    contentType,
    scannedAt:   new Date().toISOString(),
    qrCodeId,
    scanSource,
    ...(offline ? { offline: true } : {}),
  };
}
