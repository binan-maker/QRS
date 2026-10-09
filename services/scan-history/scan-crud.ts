import { db } from "@/lib/db/client";
import { supabase } from "@/lib/supabase";
import { tsToString } from "../utils";
import { tsToMs } from "../integrity/time-utils";
import { incrementSmartCounter } from "@/lib/db/distributed-counter";
import { COLLECTIONS } from "@/shared/constants/collections";
import { logger } from "@/lib/logger";
import { processEligibleScanReward } from "../rewards/reward-service";

const SCAN_SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateDocId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
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
    const qrData = await db.get([COLLECTIONS.QR_CODES, qrId]);
    const currentScanCount = qrData?.scanCount ?? 0;
    await incrementSmartCounter(qrId, currentScanCount, 1);
  } catch (e) {
    console.warn("[db] recordScan: failed to check/increment scanCount:", e);
  }

  if (userId && !isAnonymous) {
    try {
      // Atomically write the scan record and increment personalScanCount together
      // so the counter never drifts from the actual number of stored scan documents.
      const scanId = generateDocId();
      const batch = db.batch();
      batch.set([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS, scanId], {
        qrCodeId: qrId,
        content,
        contentType,
        isAnonymous: false,
        scannedAt: db.timestamp(),
        counted: true,
      });
      batch.increment([COLLECTIONS.USERS, userId], "personalScanCount", 1);
      await batch.commit();
    } catch {}

    // Evaluate eligible scan reward (Welcome Card + 3/8/15 daily milestones + referral unlock)
    processEligibleScanReward(userId, qrId, isAnonymous).catch(() => {});
  }
}

export async function getUserScans(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    [COLLECTIONS.USERS, userId, COLLECTIONS.SCANS],
    { orderBy: { field: "scannedAt", direction: "desc" }, limit: 100 }
  );
  return docs
    .filter((d) => d.data.isDeleted !== true)
    .map((d) => ({
      id: d.id,
      ...d.data,
      scannedAt: tsToString(d.data.scannedAt),
    }));
}

export async function getUserScansPaginated(
  userId: string,
  pageSize: number = 20,
  cursor?: any
): Promise<{ items: any[]; cursor: any; hasMore: boolean }> {
  // FIX: "Empty First Page" bug caused by soft-deletion interacting with pagination.
  //
  // Root cause of the old single-fetch approach:
  //   When the user deletes their N most recent scans, the first Firestore page
  //   returns N docs that are ALL marked isDeleted:true. After filtering, items=[]
  //   even though hasMore=true (there are more pages). Because the list is empty,
  //   the user can never scroll to trigger onEndReached, so page 2+ (which has
  //   their real scans) is never fetched → blank history forever.
  //
  // Fix: loop fetching batches of pageSize raw docs until we have collected at
  // least pageSize visible (non-deleted) items OR we exhaust all documents.
  // The cursor always advances to the end of the last fetched batch, so
  // subsequent page calls start from the correct Firestore position — no gaps,
  // no duplicates.
  //
  // Worst case: MAX_LOOPS * pageSize deleted docs before finding anything.
  // In practice this is 1 extra round-trip per "run" of deleted docs.
  const visibleItems: any[] = [];
  let currentCursor: any = cursor ?? null;
  let exhausted = false;
  const MAX_LOOPS = 15; // handles up to 15×pageSize consecutive deleted docs safely

  for (let loops = 0; loops < MAX_LOOPS && visibleItems.length < pageSize && !exhausted; loops++) {
    const { docs, cursor: newCursor } = await db.query(
      [COLLECTIONS.USERS, userId, COLLECTIONS.SCANS],
      { orderBy: { field: "scannedAt", direction: "desc" }, limit: pageSize, cursor: currentCursor }
    );

    for (const d of docs) {
      if (d.data.isDeleted !== true) visibleItems.push(d);
    }

    if (docs.length < pageSize) {
      exhausted = true; // Firestore returned fewer than requested → no more docs
    }

    if (docs.length > 0) currentCursor = newCursor;
  }

  return {
    items: visibleItems.map((d) => ({
      id: d.id,
      ...d.data,
      scannedAt: tsToString(d.data.scannedAt),
    })),
    cursor: exhausted ? null : currentCursor,
    hasMore: !exhausted,
  };
}

export async function deleteUserScan(
  userId: string,
  scanId: string,
  qrCodeId?: string
): Promise<void> {
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
