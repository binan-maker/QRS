/**
 * Scan deduplication utilities.
 *
 * Two scan entries represent the same event iff they share a qrCodeId AND
 * fall in the same 60-second bucket.  This collapses the offline write +
 * background-sync write (same event, ~1–2 s apart) without merging distinct
 * scan events of the same QR code on different minutes.
 */

export interface ScanLike {
  qrCodeId?: string | null;
  scannedAt: string;
}

/**
 * Merge two scan arrays (local + cloud), deduplicate by qrCodeId+minuteBucket,
 * sort newest-first, and optionally trim to `maxItems`.
 */
export function mergeAndDeduplicateScans<T extends ScanLike>(
  localItems: T[],
  cloudItems: T[],
  maxItems?: number,
): T[] {
  const combined = [...localItems, ...cloudItems];
  const seen     = new Set<string>();
  const unique: T[] = [];

  for (const scan of combined) {
    if (!scan.qrCodeId) {
      // No qrCodeId — cannot key on it; always include
      unique.push(scan);
      continue;
    }
    const minuteBucket = Math.floor(new Date(scan.scannedAt).getTime() / 60_000);
    const key          = `${scan.qrCodeId}|${minuteBucket}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(scan);
    }
  }

  const sorted = unique.sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime(),
  );

  return maxItems !== undefined ? sorted.slice(0, maxItems) : sorted;
}
