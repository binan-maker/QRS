import { db } from "@/lib/db/client";
import {
  supabase,
  createServerSupabaseClient,
  createAdminSupabaseClient,
} from "@/lib/supabase";
import { universalAsyncStorage as AsyncStorage } from "@shared/utils/universal-storage";
import { useAuthStore } from "@/store/authStore";
import { getCurrentToken } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import {
  invalidateHistoryCache,
  invalidateHomeScansCache,
} from "@/services/cache/qr-cache";
import { tsToString } from "../utils";
import { tsToMs } from "../integrity/time-utils";
import { incrementSmartCounter } from "@/lib/db/distributed-counter";
import { COLLECTIONS } from "@/shared/constants/collections";
import { logger } from "@/lib/core/logger";
import { normalizeScanContent } from "./dedup";

const SCAN_SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getCandidateScanClients(): Promise<any[]> {
  const clients: any[] = [];
  const seen = new Set<any>();

  const add = (c: any) => {
    if (c && !seen.has(c)) {
      seen.add(c);
      clients.push(c);
    }
  };

  // 1. Primary default client (holds user's active session with auto-refresh)
  add(supabase);

  // 2. Authenticated client with fresh live token from auth provider
  try {
    let token = useAuthStore.getState().token;
    if (!token) {
      token = await getCurrentToken();
    }
    if (token) {
      const authed = createServerSupabaseClient(token);
      if (authed) add(authed);
    }
  } catch {}

  // 3. Active session token from supabase.auth
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      const authed = createServerSupabaseClient(data.session.access_token);
      if (authed) add(authed);
    }
  } catch {}

  // 4. Admin client with service-role key (bypasses RLS)
  try {
    const admin = createAdminSupabaseClient();
    if (admin) add(admin);
  } catch {}

  return clients;
}

async function getSupabaseScanClient(): Promise<any> {
  const candidates = await getCandidateScanClients();
  return candidates[0] ?? supabase;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function recordScan(
  qrId: string,
  content: string,
  contentType: string,
  userId: string | null,
  isAnonymous: boolean
): Promise<void> {
  if (userId && isAnonymous) return;

  try {
    const { error: rpcErr } = await supabase.rpc("increment_field", {
      p_table: "qr_codes",
      p_id: qrId,
      p_field: "scan_count",
      p_delta: 1,
    });
    if (rpcErr) {
      const qrData = await db.get([COLLECTIONS.QR_CODES, qrId]).catch(() => null);
      const currentScanCount = qrData?.scanCount ?? 0;
      await incrementSmartCounter(qrId, currentScanCount, 1).catch(() => {});
    }
  } catch {
    try {
      const qrData = await db.get([COLLECTIONS.QR_CODES, qrId]).catch(() => null);
      const currentScanCount = qrData?.scanCount ?? 0;
      await incrementSmartCounter(qrId, currentScanCount, 1).catch(() => {});
    } catch {}
  }

  if (userId && !isAnonymous) {
    const scanId = generateUUID();
    const scannedAt = new Date().toISOString();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scanId);

    const basePayload: Record<string, any> = {
      user_id: userId,
      qr_code_id: qrId,
      content: content || "",
      content_type: contentType || "url",
      verdict: "unknown",
      scanned_at: scannedAt,
    };
    if (isUuid) basePayload.id = scanId;

    try {
      const client = await getSupabaseScanClient();
      let { error: insertErr } = await client.from("qr_scans").insert({
        ...basePayload,
        is_deleted: false,
      });

      if (insertErr && client === supabase) {
        const admin = createAdminSupabaseClient();
        const token = useAuthStore.getState().token;
        const fallbackClient = (token ? createServerSupabaseClient(token) : null) ?? admin;
        if (fallbackClient && fallbackClient !== client) {
          const { error: retryErr } = await fallbackClient.from("qr_scans").insert({
            ...basePayload,
            is_deleted: false,
          });
          if (!retryErr) insertErr = null;
        }
      }

      if (insertErr) {
        // Retry without is_deleted in case column is absent in database
        delete basePayload.id;
        const { error: retryErr } = await (await getSupabaseScanClient()).from("qr_scans").insert(basePayload);
        if (retryErr) {
          await db.set([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS, scanId], {
            qrCodeId: qrId,
            content,
            contentType,
            isDeleted: false,
            scannedAt,
          }).catch(() => {});
        }
      }
    } catch {
      try {
        delete basePayload.id;
        await (await getSupabaseScanClient()).from("qr_scans").insert(basePayload);
      } catch {
        await db.set([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS, scanId], {
          qrCodeId: qrId,
          content,
          contentType,
          isDeleted: false,
          scannedAt,
        }).catch(() => {});
      }
    }

    try {
      const { error: userRpcErr } = await supabase.rpc("increment_field", {
        p_table: "users",
        p_id: userId,
        p_field: "scan_count",
        p_delta: 1,
      });
      if (userRpcErr) {
        await db.increment([COLLECTIONS.USERS, userId], "personalScanCount", 1).catch(() => {});
      }
    } catch {
      await db.increment([COLLECTIONS.USERS, userId], "personalScanCount", 1).catch(() => {});
    }

    // Invalidate caches immediately so Home Recent Scans and History show the new scan
    try {
      queryClient.invalidateQueries({ queryKey: ["home-recent-scans", userId] });
      queryClient.invalidateQueries({ queryKey: ["history", userId] });
      invalidateHomeScansCache(userId);
      invalidateHistoryCache(userId);
    } catch {}
  }
}

export async function syncLocalScansToCloud(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const keysToTry = [
      `local_scan_history_${userId}`,
      "local_scan_history",
    ];

    const localItems: any[] = [];
    const seen = new Set<string>();

    for (const key of keysToTry) {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) continue;
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.isDeleted === true || item.is_deleted === true) continue;
            const content = item.content || item.rawContent || "";
            if (!content) continue;
            const qrId = item.qrCodeId || item.qrId || item.id;
            const dedupKey = qrId ? `qr:${qrId}` : `content:${content}`;
            if (seen.has(dedupKey)) continue;
            seen.add(dedupKey);
            localItems.push(item);
          }
        }
      } catch {}
    }

    if (localItems.length === 0) return;

    const clients = await getCandidateScanClients();
    let client = clients[0] ?? supabase;

    // Query existing to avoid re-inserting
    let existingRows: any[] | null = null;
    for (const c of clients) {
      try {
        const { data } = await c
          .from("qr_scans")
          .select("qr_code_id, content")
          .eq("user_id", userId)
          .limit(100);
        if (Array.isArray(data)) {
          existingRows = data;
          client = c;
          break;
        }
      } catch {}
    }

    const existingKeys = new Set<string>();
    if (Array.isArray(existingRows)) {
      for (const row of existingRows) {
        if (row.qr_code_id) existingKeys.add(String(row.qr_code_id));
        if (row.content) existingKeys.add(String(row.content).trim());
      }
    }

    const unsynced = localItems.filter((item) => {
      const qrId = item.qrCodeId || item.qrId;
      if (qrId && existingKeys.has(String(qrId))) return false;
      if (item.content && existingKeys.has(String(item.content).trim())) return false;
      return true;
    });

    if (unsynced.length === 0) return;

    let syncedCount = 0;
    for (const item of unsynced.slice(0, 20)) {
      const qrId = item.qrCodeId || item.qrId || generateUUID();
      const payload: Record<string, any> = {
        user_id: userId,
        qr_code_id: qrId,
        content: item.content || "",
        content_type: item.contentType || item.content_type || "url",
        verdict: item.verdict || "unknown",
        scanned_at: item.scannedAt || item.scanned_at || new Date().toISOString(),
        is_deleted: false,
      };
      let { error: insErr } = await client.from("qr_scans").insert(payload);
      if (insErr) {
        delete payload.is_deleted;
        const res = await client.from("qr_scans").insert(payload);
        if (!res.error) syncedCount++;
      } else {
        syncedCount++;
      }
    }

    if (syncedCount > 0) {
      try {
        queryClient.invalidateQueries({ queryKey: ["home-recent-scans", userId] });
        queryClient.invalidateQueries({ queryKey: ["history", userId] });
        invalidateHomeScansCache(userId);
        invalidateHistoryCache(userId);
      } catch {}
    }
  } catch (err) {
    logger.warn("[scan-crud] syncLocalScansToCloud error:", err);
  }
}

export async function getUserScans(userId: string): Promise<any[]> {
  if (!userId) return [];
  const clients = await getCandidateScanClients();

  for (const client of clients) {
    try {
      let { data: rows, error } = await client
        .from("qr_scans")
        .select("*")
        .eq("user_id", userId)
        .order("scanned_at", { ascending: false })
        .limit(100);

      if (error && (error.message?.includes("scanned_at") || error.code === "42703")) {
        const { data: altRows, error: altErr } = await client
          .from("qr_scans")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (!altErr && Array.isArray(altRows)) {
          rows = altRows;
          error = null;
        }
      }

      if (!error && Array.isArray(rows) && rows.length > 0) {
        return rows
          .filter((r) => r.is_deleted !== true && r.isDeleted !== true)
          .map((r) => ({
            id: String(r.id),
            qrCodeId: r.qr_code_id || r.qrCodeId,
            content: r.content || "",
            contentType: r.content_type || r.contentType || "url",
            scannedAt: r.scanned_at || r.scannedAt || r.created_at || new Date().toISOString(),
            source: "cloud" as const,
          }));
      }
    } catch {}
  }

  // Fallback via database adapter
  try {
    const { docs } = await db.query(
      [COLLECTIONS.USERS, userId, COLLECTIONS.SCANS],
      { orderBy: { field: "scannedAt", direction: "desc" }, limit: 100 }
    );
    if (Array.isArray(docs) && docs.length > 0) {
      return docs
        .filter((d) => d.data.isDeleted !== true && d.data.is_deleted !== true)
        .map((d) => ({
          id: d.id,
          ...d.data,
          scannedAt: tsToString(d.data.scannedAt || d.data.scanned_at || d.data.createdAt),
          source: "cloud" as const,
        }));
    }
  } catch {}

  return [];
}

export async function getUserScansPaginated(
  userId: string,
  pageSize: number = 20,
  cursor?: any
): Promise<{ items: any[]; cursor: any; hasMore: boolean }> {
  if (!userId) {
    return { items: [], cursor: null, hasMore: false };
  }

  const clients = await getCandidateScanClients();
  let scanRows: any[] | null = null;
  let successfulClient: any = null;

  // 1. Direct Supabase query across candidate clients
  for (const client of clients) {
    try {
      let query = client
        .from("qr_scans")
        .select("*")
        .eq("user_id", userId)
        .order("scanned_at", { ascending: false })
        .limit(pageSize);

      if (cursor) {
        query = query.lt("scanned_at", cursor);
      }

      let { data: rows, error: qErr } = await query;

      if (qErr && (qErr.message?.includes("scanned_at") || qErr.code === "42703")) {
        let altQuery = client
          .from("qr_scans")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(pageSize);
        if (cursor) {
          altQuery = altQuery.lt("created_at", cursor);
        }
        const { data: altRows, error: altErr } = await altQuery;
        if (!altErr && Array.isArray(altRows)) {
          rows = altRows;
          qErr = null;
        }
      }

      if (!qErr && Array.isArray(rows) && rows.length > 0) {
        scanRows = rows;
        successfulClient = client;
        break;
      }
    } catch (err) {
      logger.warn("[scan-crud] Supabase query attempt error:", err);
    }
  }

  // 2. Process rows from Supabase if found
  if (Array.isArray(scanRows) && scanRows.length > 0) {
    const filtered = scanRows.filter((r) => r.is_deleted !== true && r.isDeleted !== true);

    // Check if any rows are missing content and batch-resolve from qr_codes
    const missingQrIds: string[] = [];
    for (const row of filtered) {
      const qrId = row.qr_code_id || row.qrCodeId;
      const content = row.content || "";
      if (!content && qrId) {
        missingQrIds.push(qrId);
      }
    }

    const qrMap = new Map<string, { content: string; contentType: string }>();
    if (missingQrIds.length > 0) {
      try {
        const resolveClient = successfulClient ?? supabase;
        const { data: qrs } = await resolveClient
          .from("qr_codes")
          .select("id, content, content_type")
          .in("id", missingQrIds);
        if (Array.isArray(qrs)) {
          for (const q of qrs) {
            qrMap.set(q.id, { content: q.content || "", contentType: q.content_type || "url" });
          }
        }
      } catch {}
    }

    const items: any[] = [];
    for (const r of filtered) {
      const rawQrId = r.qr_code_id || r.qrCodeId || r.id;
      let content = r.content || "";
      let contentType = r.content_type || r.contentType || "url";
      if (!content && rawQrId && qrMap.has(rawQrId)) {
        const mapped = qrMap.get(rawQrId)!;
        content = mapped.content;
        contentType = mapped.contentType;
      }

      // Check local storage fallback if content is still empty
      if (!content && rawQrId) {
        try {
          const cached = await AsyncStorage.getItem(`qr_content_${rawQrId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            content = parsed.content || "";
            contentType = parsed.contentType || contentType;
          }
        } catch {}
      }

      items.push({
        id: String(r.id),
        qrCodeId: rawQrId,
        content,
        contentType,
        scannedAt: r.scanned_at || r.scannedAt || r.created_at || new Date().toISOString(),
        source: "cloud" as const,
      });
    }

    const lastRow = scanRows[scanRows.length - 1];
    const nextCursor = scanRows.length >= pageSize && lastRow ? (lastRow.scanned_at || lastRow.scannedAt || lastRow.created_at) : null;

    return {
      items,
      cursor: nextCursor,
      hasMore: scanRows.length >= pageSize,
    };
  }

  // 3. Fallback via database adapter (if Supabase direct query had 0 rows)
  try {
    const visibleItems: any[] = [];
    let currentCursor: any = cursor ?? null;
    let exhausted = false;
    const MAX_LOOPS = 5;

    for (let loops = 0; loops < MAX_LOOPS && visibleItems.length < pageSize && !exhausted; loops++) {
      const { docs, cursor: newCursor } = await db.query(
        [COLLECTIONS.USERS, userId, COLLECTIONS.SCANS],
        { orderBy: { field: "scannedAt", direction: "desc" }, limit: pageSize, cursor: currentCursor }
      );

      for (const d of docs) {
        if (d.data.isDeleted !== true && d.data.is_deleted !== true) visibleItems.push(d);
      }

      if (docs.length < pageSize) {
        exhausted = true;
      }
      if (docs.length > 0) currentCursor = newCursor;
    }

    if (visibleItems.length > 0) {
      return {
        items: visibleItems.map((d) => ({
          id: d.id,
          ...d.data,
          content: d.data.content || "",
          contentType: d.data.contentType || d.data.content_type || "url",
          scannedAt: tsToString(d.data.scannedAt || d.data.scanned_at),
          source: "cloud" as const,
        })),
        cursor: exhausted ? null : currentCursor,
        hasMore: !exhausted && visibleItems.length >= pageSize,
      };
    }
  } catch (dbErr) {
    logger.warn("[scan-crud] Fallback db.query failed:", dbErr);
  }

  // 4. Local storage fallback for first page: if cloud returned 0 rows, check local AsyncStorage
  if (!cursor) {
    try {
      const localKeys = [
        `local_scan_history_${userId}`,
        "local_scan_history",
      ];
      const localItems: any[] = [];
      const seen = new Set<string>();

      for (const key of localKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            for (const item of list) {
              if (item.isDeleted === true || item.is_deleted === true) continue;
              const qrId = item.qrCodeId || item.qrId || item.id;
              const content = item.content || item.rawContent || "";
              const dedupKey = qrId ? `qr:${qrId}` : `c:${content}`;
              if (seen.has(dedupKey)) continue;
              seen.add(dedupKey);

              localItems.push({
                id: String(item.id || qrId || Date.now()),
                qrCodeId: qrId,
                content,
                contentType: item.contentType || item.content_type || "url",
                scannedAt: item.scannedAt || item.scanned_at || new Date().toISOString(),
                source: "local" as const,
              });
            }
          }
        }
      }

      if (localItems.length > 0) {
        localItems.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
        const pageItems = localItems.slice(0, pageSize);
        // Kick off cloud sync in background so local items get persisted to Supabase
        syncLocalScansToCloud(userId).catch(() => {});
        return {
          items: pageItems,
          cursor: null,
          hasMore: localItems.length > pageSize,
        };
      }
    } catch {}
  }

  return { items: [], cursor: null, hasMore: false };
}

export async function deleteUserScan(
  userId: string,
  scanId: string,
  qrCodeId?: string
): Promise<void> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scanId);
    if (isUuid) {
      await supabase
        .from("qr_scans")
        .update({ is_deleted: true })
        .eq("user_id", userId)
        .eq("id", scanId);
    }
    if (qrCodeId) {
      await supabase
        .from("qr_scans")
        .update({ is_deleted: true })
        .eq("user_id", userId)
        .eq("qr_code_id", qrCodeId);
    }
  } catch {}

  try {
    const batch = db.batch();
    batch.update([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS, scanId], { isDeleted: true, deletedAt: db.timestamp() });
    batch.increment([COLLECTIONS.USERS, userId], "personalScanCount", -1);
    await batch.commit();

    if (qrCodeId) {
      deleteDuplicateUserScansByQrCode(userId, qrCodeId, scanId).catch(() => {});
    }
  } catch {}
}

export async function deleteDuplicateUserScansByQrCode(
  userId: string,
  qrCodeId: string,
  excludeScanId?: string
): Promise<void> {
  try {
    // 1. Direct Supabase update on qr_scans table
    let query = supabase
      .from("qr_scans")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("qr_code_id", qrCodeId)
      .eq("is_deleted", false);

    if (excludeScanId) {
      query = query.neq("id", excludeScanId);
    }

    const { data: updatedRows, error } = await query.select("id");
    if (!error && Array.isArray(updatedRows) && updatedRows.length > 0) {
      try {
        await db.increment([COLLECTIONS.USERS, userId], "personalScanCount", -updatedRows.length);
      } catch {}
      return;
    }
  } catch {}

  // 2. Fallback via database adapter
  try {
    const { docs } = await db.query([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS], {
      where: [{ field: "qrCodeId", op: "==", value: qrCodeId }],
      limit: 100,
    });
    const duplicates = docs.filter((d) => d.id !== excludeScanId && d.data?.isDeleted !== true);
    if (duplicates.length > 0) {
      const batch = db.batch();
      for (const d of duplicates) {
        batch.update([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS, d.id], {
          isDeleted: true,
          deletedAt: db.timestamp(),
        });
      }
      batch.increment([COLLECTIONS.USERS, userId], "personalScanCount", -duplicates.length);
      await batch.commit();
    }
  } catch {}
}

export async function deleteLocalScan(
  userId?: string | null,
  target: { id?: string; qrCodeId?: string | null; content?: string | null } = {}
): Promise<void> {
  const targetId = target.id;
  const targetQrId = target.qrCodeId;
  const targetNormContent = target.content ? normalizeScanContent(target.content) : null;

  const isMatch = (s: any) => {
    if (targetId && s.id === targetId) return true;
    if (targetQrId && (s.qrCodeId === targetQrId || s.qrId === targetQrId)) return true;
    if (targetNormContent && s.content && normalizeScanContent(s.content) === targetNormContent) return true;
    return false;
  };

  const keys = [
    userId ? `local_scan_history_${userId}` : null,
    "local_scan_history",
  ].filter(Boolean) as string[];

  for (const key of keys) {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          const filtered = arr.filter((s: any) => !isMatch(s));
          await AsyncStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    } catch {}
  }
}

export async function deleteAllUserScans(userId: string): Promise<void> {
  try {
    const { data: updatedRows, error } = await supabase
      .from("qr_scans")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .select("id");

    if (!error && Array.isArray(updatedRows)) {
      if (updatedRows.length > 0) {
        await db.increment([COLLECTIONS.USERS, userId], "personalScanCount", -updatedRows.length).catch(() => {});
      }
      return;
    }
  } catch {}

  try {
    const { docs } = await db.query([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS], {
      orderBy: { field: "scannedAt", direction: "desc" },
      limit: 500,
    });
    const softDeleteCount = docs.length;
    await Promise.all(
      docs.map((d) =>
        db.update([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS, d.id], { isDeleted: true, deletedAt: db.timestamp() }).catch(() => {})
      )
    );
    if (softDeleteCount > 0) {
      await db.increment([COLLECTIONS.USERS, userId], "personalScanCount", -softDeleteCount);
    }
  } catch {}
}

export async function purgeOldSoftDeleteScans(userId: string): Promise<void> {
  try {
    const { docs } = await db.query([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS], {
      orderBy: { field: "scannedAt", direction: "desc" },
      limit: 500,
    });
    const now = Date.now();
    const toDelete: string[] = [];

    for (const d of docs) {
      if (!d.data.isDeleted) continue;
      const deletedAt = d.data.deletedAt;
      let deletedAtMs = 0;
      deletedAtMs = tsToMs(deletedAt);
      if (deletedAtMs > 0 && now - deletedAtMs > SCAN_SOFT_DELETE_TTL_MS) {
        toDelete.push(d.id);
      }
    }

    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(id => db.delete([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS, id]).catch(() => {})));
    }
  } catch {}
}

export async function hardDeleteOldSoftDeleteScans(): Promise<void> {
  const now = Date.now();
  let totalDeleted = 0;

  try {
    const { docs: userDocs } = await db.query([COLLECTIONS.USERS], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 500,
    });

    for (const userDoc of userDocs) {
      const userId = userDoc.id;
      const { docs: scanDocs } = await db.query([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS], {
        orderBy: { field: "scannedAt", direction: "desc" },
        limit: 200,
      });

      const toDelete: string[] = [];
      for (const d of scanDocs) {
        if (!d.data.isDeleted) continue;
        const deletedAt = d.data.deletedAt;
        let deletedAtMs = 0;
        deletedAtMs = tsToMs(deletedAt);
        if (deletedAtMs > 0 && now - deletedAtMs > SCAN_SOFT_DELETE_TTL_MS) {
          toDelete.push(d.id);
        }
      }

      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(id => db.delete([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS, id]).catch(() => {})));
        totalDeleted += toDelete.length;
      }
    }

    logger.log(`[cleanup] hardDeleteOldSoftDeleteScans: Deleted ${totalDeleted} old soft-deleted scans`);
  } catch (e) {
    console.error("[cleanup] hardDeleteOldSoftDeleteScans failed:", e);
  }
}
