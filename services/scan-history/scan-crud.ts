import { db } from "@/lib/db/client";
import { supabase } from "@/lib/supabase";
import { tsToString } from "../utils";
import { tsToMs } from "../integrity/time-utils";
import { incrementSmartCounter } from "@/lib/db/distributed-counter";
import { COLLECTIONS } from "@/shared/constants/collections";
import { logger } from "@/lib/logger";
import { processEligibleScanReward } from "../rewards/reward-service";

const SCAN_SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
      const { error: insertErr } = await supabase.from("qr_scans").insert({
        ...basePayload,
        is_deleted: false,
      });

      if (insertErr) {
        // Retry without is_deleted in case column is absent in database
        delete basePayload.id;
        const { error: retryErr } = await supabase.from("qr_scans").insert(basePayload);
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
        await supabase.from("qr_scans").insert(basePayload);
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

    // Evaluate eligible scan reward (Welcome Card + 3/8/15 daily milestones + referral unlock)
    processEligibleScanReward(userId, qrId, isAnonymous).catch(() => {});
  }
}

export async function getUserScans(userId: string): Promise<any[]> {
  if (!userId) return [];
  try {
    const { data: rows, error } = await supabase
      .from("qr_scans")
      .select("*")
      .eq("user_id", userId)
      .order("scanned_at", { ascending: false })
      .limit(100);

    if (!error && Array.isArray(rows)) {
      return rows
        .filter((r) => r.is_deleted !== true && r.isDeleted !== true)
        .map((r) => ({
          id: String(r.id),
          qrCodeId: r.qr_code_id || r.qrCodeId,
          content: r.content || "",
          contentType: r.content_type || r.contentType || "url",
          scannedAt: r.scanned_at || r.scannedAt || new Date().toISOString(),
          source: "cloud" as const,
        }));
    }
  } catch {}

  try {
    const { docs } = await db.query(
      [COLLECTIONS.USERS, userId, COLLECTIONS.SCANS],
      { orderBy: { field: "scannedAt", direction: "desc" }, limit: 100 }
    );
    return docs
      .filter((d) => d.data.isDeleted !== true && d.data.is_deleted !== true)
      .map((d) => ({
        id: d.id,
        ...d.data,
        scannedAt: tsToString(d.data.scannedAt || d.data.scanned_at),
        source: "cloud" as const,
      }));
  } catch {
    return [];
  }
}

export async function getUserScansPaginated(
  userId: string,
  pageSize: number = 20,
  cursor?: any
): Promise<{ items: any[]; cursor: any; hasMore: boolean }> {
  if (!userId) {
    return { items: [], cursor: null, hasMore: false };
  }

  // 1. Direct Supabase query
  try {
    let query = supabase
      .from("qr_scans")
      .select("*")
      .eq("user_id", userId)
      .order("scanned_at", { ascending: false })
      .limit(pageSize);

    if (cursor) {
      query = query.lt("scanned_at", cursor);
    }

    const { data: rows, error: qErr } = await query;
    let scanRows = rows;

    if (!qErr && Array.isArray(scanRows) && scanRows.length > 0) {
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
          const { data: qrs } = await supabase
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

      const items = filtered.map((r) => {
        const rawQrId = r.qr_code_id || r.qrCodeId || r.id;
        let content = r.content || "";
        let contentType = r.content_type || r.contentType || "url";
        if (!content && rawQrId && qrMap.has(rawQrId)) {
          const mapped = qrMap.get(rawQrId)!;
          content = mapped.content;
          contentType = mapped.contentType;
        }

        return {
          id: String(r.id),
          qrCodeId: rawQrId,
          content,
          contentType,
          scannedAt: r.scanned_at || r.scannedAt || new Date().toISOString(),
          source: "cloud" as const,
        };
      });

      const lastRow = scanRows[scanRows.length - 1];
      const nextCursor = scanRows.length >= pageSize && lastRow ? (lastRow.scanned_at || lastRow.scannedAt) : null;

      return {
        items,
        cursor: nextCursor,
        hasMore: scanRows.length >= pageSize,
      };
    } else if (!qErr && Array.isArray(scanRows)) {
      return { items: [], cursor: null, hasMore: false };
    }
  } catch (err) {
    console.warn("[scan-crud] Supabase direct query failed:", err);
  }

  // 2. Fallback via database adapter
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
      hasMore: !exhausted,
    };
  } catch {
    return { items: [], cursor: null, hasMore: false };
  }
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
