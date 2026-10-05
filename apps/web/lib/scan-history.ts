import { getWebSupabase, isWebSupabaseConfigured } from "./supabase";
import { getQrIdFromContentSync } from "./qr-share";
import { mergeAndDeduplicateScans, normalizeScanContent } from "@services/scan-history/dedup";

export interface ScanItem {
  id: string;
  content: string;
  contentType: string;
  scannedAt: string;
  qrCodeId: string;
  source: "cloud" | "local";
  verdict?: "safe" | "caution" | "flagged" | "unknown";
}

export interface ScanStats {
  total: number;
  payment: number;
  url: number;
  contact: number;
  wifi: number;
  others: number;
}

const PAYMENT_TYPES = new Set([
  "payment",
  "paymentlink",
  "paypal",
  "venmo",
  "mobilepay",
  "scantopay",
  "razorpay",
  "upi",
  "crypto",
]);

const CONTACT_TYPES = new Set([
  "contact",
  "phone",
  "email",
  "sms",
  "whatsapp",
  "telegram",
]);

const ALL_KNOWN_TYPES = new Set([
  "url",
  "wifi",
  ...PAYMENT_TYPES,
  ...CONTACT_TYPES,
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cache timestamp for throttling rapid focus refetches
let lastFetchTime = 0;
let lastCachedScans: ScanItem[] = [];
let lastFetchUserId: string | null | undefined = undefined;

/**
 * Loads scans from both Supabase cloud database and device local storage,
 * merging and deduplicating them so the latest scan always shows first.
 */
export async function fetchUserScans(
  userId?: string | null,
  forceRefresh = false
): Promise<ScanItem[]> {
  const now = Date.now();
  // Return cached result if called within 8 seconds for the same user unless forced
  if (
    !forceRefresh &&
    lastFetchUserId === userId &&
    now - lastFetchTime < 8000 &&
    lastCachedScans.length > 0
  ) {
    return lastCachedScans;
  }

  const cloudItems: ScanItem[] = [];

  // 1. Fetch Cloud Scans from Supabase if user is logged in
  if (userId && isWebSupabaseConfigured()) {
    try {
      const supabase = getWebSupabase();
      // Primary targeted query: fetch only needed columns for faster transfer
      const { data, error } = await supabase
        .from("qr_scans")
        .select("id, user_id, qr_code_id, content, content_type, scanned_at, is_deleted")
        .eq("user_id", userId)
        .order("scanned_at", { ascending: false })
        .limit(100);

      let rows: any[] = (data as any[]) || [];
      if (error) {
        console.warn("[scan-history] Primary query error, retrying fallback:", error.message);
        const fallback = await supabase
          .from("qr_scans")
          .select("*")
          .eq("user_id", userId)
          .order("scanned_at", { ascending: false })
          .limit(100);
        if (!fallback.error && Array.isArray(fallback.data)) {
          rows = fallback.data;
        }
      }

      if (Array.isArray(rows)) {
        // Collect rows missing content to batch resolve from qr_codes
        const missingContentQrIds: string[] = [];
        for (const row of rows) {
          if (row.is_deleted === true || row.isDeleted === true) continue;
          const qrId = row.qr_code_id || row.qrCodeId;
          const content = row.content || "";
          if (!content && qrId) {
            missingContentQrIds.push(qrId);
          }
        }

        const qrContentMap = new Map<string, { content: string; contentType: string }>();
        if (missingContentQrIds.length > 0) {
          try {
            const { data: qrRows } = await supabase
              .from("qr_codes")
              .select("id, content, content_type")
              .in("id", missingContentQrIds);
            if (Array.isArray(qrRows)) {
              for (const qr of qrRows) {
                qrContentMap.set(qr.id, {
                  content: qr.content || "",
                  contentType: qr.content_type || "text",
                });
              }
            }
          } catch {}
        }

        for (const row of rows) {
          // Soft-deletion check in JavaScript: safe even if column does not exist
          if (row.is_deleted === true || row.isDeleted === true) continue;

          const rawQrId = row.qr_code_id || row.qrCodeId || row.id;
          let content = row.content || "";
          let contentType = row.content_type || row.contentType || "url";

          if (!content && rawQrId && qrContentMap.has(rawQrId)) {
            const mapped = qrContentMap.get(rawQrId)!;
            content = mapped.content;
            contentType = mapped.contentType;
          }

          const qrId =
            rawQrId && rawQrId !== "custom" && /^[0-9a-f]{20}$/i.test(String(rawQrId))
              ? String(rawQrId).toLowerCase()
              : content
                ? getQrIdFromContentSync(content)
                : String(rawQrId);

          // Also check local storage fallback if content is still empty
          if (!content && typeof window !== "undefined" && qrId) {
            try {
              const cached = localStorage.getItem(`qr_content_${qrId}`);
              if (cached) {
                const parsed = JSON.parse(cached);
                content = parsed.content || "";
                contentType = parsed.contentType || contentType;
              }
            } catch {}
          }

          cloudItems.push({
            id: String(row.id),
            content,
            contentType,
            scannedAt: row.scanned_at || row.scannedAt || new Date().toISOString(),
            qrCodeId: qrId,
            source: "cloud",
          });
        }
      }
    } catch (err) {
      console.warn("[scan-history] Supabase fetch error:", err);
    }
  }

  // 2. Fetch Local Storage Scans
  // When user is authenticated, isolate strictly to their user-namespaced local key
  // to prevent shared-device cross-account pollution.
  const localItems: ScanItem[] = [];
  if (typeof window !== "undefined") {
    try {
      const localKeys = userId
        ? [`local_scan_history_${userId}`]
        : [
            "local_scan_history",
            "binro_recent_scans",
            "binro_scan_history",
            "binro_scans",
          ];

      const seenLocal = new Set<string>();

      for (const key of localKeys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.isDeleted === true || item.is_deleted === true) continue;
            const rawQrId = item.qrCodeId || item.qrId || item.id;
            const content = item.content || item.rawContent || "";
            const qrId =
              rawQrId && rawQrId !== "custom" && /^[0-9a-f]{20}$/i.test(String(rawQrId))
                ? String(rawQrId).toLowerCase()
                : content
                  ? getQrIdFromContentSync(content)
                  : String(rawQrId || "");
            const norm = normalizeScanContent(content);
            const dedupKey = qrId ? `qr:${qrId}` : `c:${norm}`;

            if (seenLocal.has(dedupKey)) continue;
            seenLocal.add(dedupKey);

            localItems.push({
              id: String(item.id || qrId || Date.now().toString()),
              content,
              contentType: item.contentType || item.content_type || "url",
              scannedAt:
                item.scannedAt ||
                item.scanned_at ||
                item.timestamp ||
                new Date().toISOString(),
              qrCodeId: qrId,
              source: item.source === "cloud" ? "cloud" : "local",
            });
          }
        }
      }
    } catch {}
  }

  // 3. Merge & Deduplicate
  const merged = mergeAndDeduplicateScans(localItems, cloudItems);

  // Return items sorted newest first
  merged.sort((a, b) => {
    const timeA = new Date(a.scannedAt).getTime() || 0;
    const timeB = new Date(b.scannedAt).getTime() || 0;
    return timeB - timeA;
  });

  // 4. One-time Sync for local scans when user is logged in
  if (userId && typeof window !== "undefined") {
    if (isWebSupabaseConfigured() && merged.length > 0) {
      const unsynced = merged.filter((item) => item.source === "local" && item.content);
      if (unsynced.length > 0) {
        const supabase = getWebSupabase();
        // Mark local items as synced immediately to prevent infinite duplicates
        for (const item of unsynced) {
          item.source = "cloud";
        }
        Promise.all(
          unsynced.slice(0, 10).map(async (item) => {
            try {
              const isUuid = UUID_REGEX.test(item.id);
              const resolvedQrId =
                item.qrCodeId && item.qrCodeId !== "custom" && /^[0-9a-f]{20}$/i.test(item.qrCodeId)
                  ? item.qrCodeId.toLowerCase()
                  : item.content
                    ? getQrIdFromContentSync(item.content)
                    : "custom";
              const payload: any = {
                user_id: userId,
                qr_code_id: resolvedQrId,
                content: item.content,
                content_type: item.contentType || "url",
                is_deleted: false,
                scanned_at: item.scannedAt || new Date().toISOString(),
              };

              if (isUuid) {
                payload.id = item.id;
                await supabase.from("qr_scans").upsert(payload, { onConflict: "id" });
              } else {
                await supabase.from("qr_scans").insert(payload);
              }
            } catch {}
          })
        ).catch(() => {});
      }
    }

    try {
      localStorage.setItem(`local_scan_history_${userId}`, JSON.stringify(merged));
    } catch {}
  }

  lastFetchTime = Date.now();
  lastCachedScans = merged;
  lastFetchUserId = userId;

  return merged;
}

/**
 * Deletes a specific scan (and any older duplicates of that exact same destination
 * for that user) from Supabase and local storage, ensuring deleted items do not
 * bubble back up on subsequent reloads.
 */
export async function deleteUserScan(
  userId: string | null | undefined,
  scanId: string,
  qrCodeId?: string,
  content?: string
): Promise<void> {
  let supabaseSuccess = true;
  const normContent = content ? normalizeScanContent(content) : null;

  // 1. Supabase Delete
  if (userId && isWebSupabaseConfigured()) {
    try {
      const supabase = getWebSupabase();
      // Soft-delete targeted primary scan row
      const { error: softErr } = await supabase
        .from("qr_scans")
        .update({ is_deleted: true })
        .eq("user_id", userId)
        .eq("id", scanId);

      // If soft-delete is blocked by schema or RLS, try hard delete
      if (softErr) {
        const { error: hardErr } = await supabase
          .from("qr_scans")
          .delete()
          .eq("user_id", userId)
          .eq("id", scanId);

        if (hardErr) {
          supabaseSuccess = false;
          throw hardErr;
        }
      }

      // Also clean up any older duplicates of this exact destination for this user
      // so older occurrences do not bubble up into the deduplicated view
      if (content && content.trim()) {
        await supabase
          .from("qr_scans")
          .update({ is_deleted: true })
          .eq("user_id", userId)
          .eq("content", content.trim());
      }

      if (qrCodeId) {
        await supabase
          .from("qr_scans")
          .update({ is_deleted: true })
          .eq("user_id", userId)
          .eq("qr_code_id", qrCodeId);
      }
    } catch (err) {
      console.warn("[scan-history] Supabase delete error:", err);
      supabaseSuccess = false;
      throw err;
    }
  }

  // 2. Remove from LocalStorage
  if (typeof window !== "undefined") {
    try {
      const keysToClean = userId
        ? [`local_scan_history_${userId}`]
        : ["binro_recent_scans", "binro_scan_history", "local_scan_history", "binro_scans"];

      for (const key of keysToClean) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const updated = list.filter((i: any) => {
            if (String(i.id) === String(scanId)) return false;
            if (qrCodeId && (i.qrCodeId === qrCodeId || i.qrId === qrCodeId)) return false;
            if (normContent && normalizeScanContent(i.content || i.rawContent) === normContent) return false;
            return true;
          });
          localStorage.setItem(key, JSON.stringify(updated));
        }
      }
    } catch {}
  }

  // 3. Update in-memory cache
  lastCachedScans = lastCachedScans.filter((i) => {
    if (String(i.id) === String(scanId)) return false;
    if (qrCodeId && i.qrCodeId === qrCodeId) return false;
    if (normContent && normalizeScanContent(i.content) === normContent) return false;
    return true;
  });

  if (!supabaseSuccess && userId) {
    throw new Error("Failed to delete scan from cloud.");
  }
}

/**
 * Clears all scan history for the user (soft deletes / deletes all user scans in Supabase,
 * and purges local storage caches).
 */
export async function clearAllUserScans(userId?: string | null): Promise<void> {
  if (userId && isWebSupabaseConfigured()) {
    try {
      const supabase = getWebSupabase();
      const { error } = await supabase
        .from("qr_scans")
        .update({ is_deleted: true })
        .eq("user_id", userId);

      if (error) {
        await supabase.from("qr_scans").delete().eq("user_id", userId);
      }
    } catch (err) {
      console.warn("[scan-history] Clear all error:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      if (userId) {
        localStorage.removeItem(`local_scan_history_${userId}`);
      }
      localStorage.removeItem("binro_recent_scans");
      localStorage.removeItem("binro_scan_history");
      localStorage.removeItem("local_scan_history");
      localStorage.removeItem("binro_scans");
    } catch {}
  }

  lastCachedScans = [];
}

/**
 * Computes statistics from scan items matching mobile categories.
 */
export function computeScanStats(scans: ScanItem[]): ScanStats {
  let payment = 0;
  let url = 0;
  let contact = 0;
  let wifi = 0;
  let others = 0;

  for (const s of scans) {
    const type = (s.contentType || "").toLowerCase();
    if (type === "url") {
      url++;
    } else if (type === "wifi") {
      wifi++;
    } else if (PAYMENT_TYPES.has(type) || s.content.toLowerCase().startsWith("upi://")) {
      payment++;
    } else if (CONTACT_TYPES.has(type)) {
      contact++;
    } else {
      others++;
    }
  }

  return {
    total: scans.length,
    payment,
    url,
    contact,
    wifi,
    others,
  };
}
