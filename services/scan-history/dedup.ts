/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCAN DEDUPLICATION UTILITIES (YouTube Watch-History Semantics)
 * ───────────────────────────────────────────────────────────────────────────────
 * Like YouTube watch history:
 * When a user scans the same QR code / destination multiple times (e.g. binan.com
 * scanned 2, 10, or more times), the recent scans and history lists show ONLY
 * the most recent scan data for that QR code.
 *
 * The scan moves to the top of the list (at its latest scannedAt timestamp),
 * and older duplicate scan events for that same QR code are suppressed.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface ScanLike {
  id?: string;
  qrCodeId?: string | null;
  content?: string;
  scannedAt: string;
}

/**
 * Normalizes content string for comparison (lowercases URL protocols/hostnames,
 * trims whitespace, removes trailing slashes).
 */
export function normalizeScanContent(rawContent?: string | null): string {
  if (!rawContent) return "";
  const trimmed = rawContent.trim();
  if (!trimmed) return "";
  try {
    if (/^[a-z]+:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      const pathname = parsed.pathname.replace(/\/+$/, "");
      return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // If not a standard URL, fallback to lowercased trimmed text without trailing slash
  }
  return trimmed.toLowerCase().replace(/\/+$/, "");
}

/**
 * Merge two scan arrays (local + cloud), sort newest-first, and deduplicate
 * by QR code identity (qrCodeId and/or normalized content) like YouTube watch history.
 *
 * The most recent scan of each unique QR code is preserved at its latest timestamp.
 * Older duplicate scans are discarded.
 */
export function mergeAndDeduplicateScans<T extends ScanLike>(
  localItems: T[],
  cloudItems: T[],
  maxItems?: number,
): T[] {
  // Combine all items with pre-computed timestamps
  const allItems: { item: T; ts: number }[] = [];

  for (let i = 0; i < localItems.length; i++) {
    const item = localItems[i];
    if (item && item.scannedAt) {
      allItems.push({ item, ts: Date.parse(item.scannedAt) || 0 });
    }
  }
  for (let i = 0; i < cloudItems.length; i++) {
    const item = cloudItems[i];
    if (item && item.scannedAt) {
      allItems.push({ item, ts: Date.parse(item.scannedAt) || 0 });
    }
  }

  // Sort newest first — zero Date allocations during sort
  allItems.sort((a, b) => b.ts - a.ts);

  const seenKeys = new Set<string>();
  const result: T[] = [];

  for (let i = 0; i < allItems.length; i++) {
    const { item } = allItems[i];

    const qrKey = item.qrCodeId && item.qrCodeId.trim()
      ? `qr:${item.qrCodeId.trim()}`
      : null;

    const contentKey = item.content && item.content.trim()
      ? `content:${normalizeScanContent(item.content)}`
      : null;

    // If already seen via either qrCodeId or normalized content, skip older duplicate
    if ((qrKey && seenKeys.has(qrKey)) || (contentKey && seenKeys.has(contentKey))) {
      continue;
    }

    // Fallback if neither qrCodeId nor content is present: deduplicate by item id
    if (!qrKey && !contentKey) {
      const idKey = item.id ? `id:${item.id}` : null;
      if (idKey && seenKeys.has(idKey)) {
        continue;
      }
      if (idKey) seenKeys.add(idKey);
    }

    if (qrKey) seenKeys.add(qrKey);
    if (contentKey) seenKeys.add(contentKey);

    result.push(item);

    if (maxItems !== undefined && result.length >= maxItems) {
      break;
    }
  }

  return result;
}
