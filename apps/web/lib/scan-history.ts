import { getWebSupabase, isWebSupabaseConfigured } from "./supabase";
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

/**
 * Loads scans from both Supabase cloud database and device local storage,
 * merging and deduplicating them so the latest scan always shows first.
 */
export async function fetchUserScans(userId?: string | null): Promise<ScanItem[]> {
  const cloudItems: ScanItem[] = [];

  // 1. Fetch Cloud Scans from Supabase if user is logged in
  if (userId && isWebSupabaseConfigured()) {
    try {
      const supabase = getWebSupabase();
      // Resilient select: avoid requesting columns like created_at or is_deleted
      // in explicit list or where clause in case they are not in the table.
      const { data, error } = await supabase
        .from("qr_scans")
        .select("*")
        .eq("user_id", userId)
        .order("scanned_at", { ascending: false })
        .limit(100);

      let rows = data;
      if (error) {
        console.warn("[scan-history] Supabase order query error, retrying without order:", error.message);
        const fallback = await supabase
          .from("qr_scans")
          .select("*")
          .eq("user_id", userId)
          .limit(100);
        if (!fallback.error && Array.isArray(fallback.data)) {
          rows = fallback.data;
        }
      }

      if (Array.isArray(rows)) {
        // Collect any row missing content to batch resolve from qr_codes
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

          const qrId = row.qr_code_id || row.qrCodeId || row.id;
          let content = row.content || "";
          let contentType = row.content_type || row.contentType || "url";

          if (!content && qrId && qrContentMap.has(qrId)) {
            const mapped = qrContentMap.get(qrId)!;
            content = mapped.content;
            contentType = mapped.contentType;
          }

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
  const localItems: ScanItem[] = [];
  if (typeof window !== "undefined") {
    try {
      const localKeys = userId
        ? [
            `local_scan_history_${userId}`,
            "binro_recent_scans",
            "binro_scan_history",
            "local_scan_history",
            "binro_scans",
          ]
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
            const qrId = item.qrCodeId || item.qrId || item.id;
            const content = item.content || item.rawContent || "";
            const norm = normalizeScanContent(content);
            const dedupKey = qrId ? `qr:${qrId}` : `c:${norm}`;

            if (seenLocal.has(dedupKey)) continue;
            seenLocal.add(dedupKey);

            localItems.push({
              id: String(item.id || qrId || Date.now().toString()),
              content,
              contentType: item.contentType || item.content_type || "url",
              scannedAt: item.scannedAt || item.scanned_at || item.timestamp || new Date().toISOString(),
              qrCodeId: qrId,
              source: "local",
            });
          }
        }
      }
    } catch {}
  }

  // 3. Merge & Deduplicate (YouTube Watch-History Semantics)
  const merged = mergeAndDeduplicateScans(localItems, cloudItems);

  // Return items sorted newest first
  merged.sort((a, b) => {
    const timeA = new Date(a.scannedAt).getTime() || 0;
    const timeB = new Date(b.scannedAt).getTime() || 0;
    return timeB - timeA;
  });

  // If user is logged in, preserve merged scans in user's local storage and sync local scans to Supabase
  if (userId && typeof window !== "undefined") {
    try {
      localStorage.setItem(`local_scan_history_${userId}`, JSON.stringify(merged));
    } catch {}

    if (isWebSupabaseConfigured() && merged.length > 0) {
      const unsynced = merged.filter((item) => item.source === "local" && item.content);
      if (unsynced.length > 0) {
        const supabase = getWebSupabase();
        Promise.all(
          unsynced.slice(0, 10).map(async (item) => {
            try {
              const scanId = item.id && item.id.length > 10 ? item.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
              await supabase.from("qr_scans").upsert({
                id: scanId,
                user_id: userId,
                qr_code_id: item.qrCodeId || item.id,
                content: item.content,
                content_type: item.contentType || "url",
                scanned_at: item.scannedAt || new Date().toISOString(),
                scan_source: "web",
                platform: "web",
                is_anonymous: false,
              }, { onConflict: "id" });
            } catch {}
          })
        ).catch(() => {});
      }
    }
  }

  return merged;
}

/**
 * Deletes a scan from Supabase and removes it from local storage.
 */
export async function deleteUserScan(
  userId: string | null | undefined,
  scanId: string,
  qrCodeId?: string
): Promise<void> {
  // 1. Supabase Delete
  if (userId && isWebSupabaseConfigured()) {
    try {
      const supabase = getWebSupabase();
      // Try soft-delete first
      const { error: softErr } = await supabase
        .from("qr_scans")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("id", scanId);

      // If soft-delete is blocked by schema or RLS, try hard delete
      if (softErr) {
        await supabase
          .from("qr_scans")
          .delete()
          .eq("user_id", userId)
          .eq("id", scanId);
      }

      // Also clean up by qr_code_id if provided
      if (qrCodeId) {
        await supabase
          .from("qr_scans")
          .delete()
          .eq("user_id", userId)
          .eq("qr_code_id", qrCodeId);
      }
    } catch (err) {
      console.warn("[scan-history] Supabase delete error:", err);
    }
  }

  // 2. Remove from LocalStorage
  if (typeof window !== "undefined") {
    try {
      const keysToClean = userId
        ? [
            `local_scan_history_${userId}`,
            "binro_recent_scans",
            "binro_scan_history",
            "local_scan_history",
          ]
        : ["binro_recent_scans", "binro_scan_history", "local_scan_history"];

      for (const key of keysToClean) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const updated = list.filter((i: any) => {
            const matchId = String(i.id) === scanId;
            const matchQr = qrCodeId && (i.qrCodeId === qrCodeId || i.qrId === qrCodeId);
            return !matchId && !matchQr;
          });
          localStorage.setItem(key, JSON.stringify(updated));
        }
      }
    } catch {}
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
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) {
        await supabase
          .from("qr_scans")
          .delete()
          .eq("user_id", userId);
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
    } catch {}
  }
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
