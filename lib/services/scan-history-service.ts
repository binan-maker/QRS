// ─── Scan History Service ─────────────────────────────────────────────────────
// Single responsibility: recording and retrieving user scan history.
// Privacy guarantee: signed-in users in anonymous mode → zero database writes.

import { db, rtdb } from "../db/client";
import { tsToString } from "./utils";

export async function recordScan(
  qrId: string,
  content: string,
  contentType: string,
  userId: string | null,
  isAnonymous: boolean,
  scanSource: "camera" | "gallery" = "camera"
): Promise<void> {
  // Signed-in users in anonymous mode: absolute zero database interaction.
  // This is a privacy and legal compliance requirement.
  if (userId && isAnonymous) return;

  try {
    await db.increment(["qrCodes", qrId], "scanCount", 1);
  } catch (e) {
    console.warn("[db] recordScan: failed to increment scanCount:", e);
  }

  if (userId && !isAnonymous) {
    try {
      await db.add(["users", userId, "scans"], {
        qrCodeId: qrId, content, contentType,
        isAnonymous: false, scannedAt: db.timestamp(),
        scanSource,
      });
    } catch {}
  }

  try {
    await rtdb.push(`qrScanVelocity/${qrId}`, { ts: Date.now() });
  } catch {}
}

export async function getUserScans(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    ["users", userId, "scans"],
    { orderBy: { field: "scannedAt", direction: "desc" }, limit: 100 }
  );
  return docs.map((d) => ({
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
  const { docs, cursor: newCursor } = await db.query(
    ["users", userId, "scans"],
    { orderBy: { field: "scannedAt", direction: "desc" }, limit: pageSize + 1, cursor }
  );
  const hasMore = docs.length > pageSize;
  const sliced = hasMore ? docs.slice(0, pageSize) : docs;
  // Filter out soft-deleted records client-side (avoids Firestore composite index requirement)
  const items = sliced.filter((d) => d.data.isDeleted !== true);
  return {
    items: items.map((d) => ({ id: d.id, ...d.data, scannedAt: tsToString(d.data.scannedAt) })),
    cursor: items.length > 0 ? newCursor : null,
    hasMore,
  };
}

export async function deleteUserScan(userId: string, scanId: string): Promise<void> {
  try {
    await db.update(["users", userId, "scans", scanId], { isDeleted: true, deletedAt: db.timestamp() });
  } catch {}
}

export interface ScanStatsResult {
  total: number;
  byUrl: number;
  byText: number;
  byPayment: number;
  byOther: number;
  byCamera: number;
  byGallery: number;
}

export async function getUserScanStats(userId: string): Promise<ScanStatsResult> {
  // FIX #1: Single query instead of 6 separate queries
  // Fetch all scans once and count client-side to reduce Firestore reads by 6x
  const { docs } = await db.query(["users", userId, "scans"], { limit: 5000 });
  
  const stats = docs.reduce((acc, d) => {
    const data = d.data;
    acc.total++;
    
    if (data.contentType === "url") acc.byUrl++;
    else if (data.contentType === "text") acc.byText++;
    else if (data.contentType === "payment") acc.byPayment++;
    else acc.byOther++;
    
    if (data.scanSource === "camera") acc.byCamera++;
    else if (data.scanSource === "gallery") acc.byGallery++;
    
    return acc;
  }, { total: 0, byUrl: 0, byText: 0, byPayment: 0, byOther: 0, byCamera: 0, byGallery: 0 });
  
  return stats;
}

export async function getUserAllScansForStats(userId: string): Promise<Array<{ id: string; content: string; contentType: string }>> {
  const { docs } = await db.query(["users", userId, "scans"], { orderBy: { field: "scannedAt", direction: "desc" }, limit: 5000 });
  return docs
    .filter((d) => d.data.isDeleted !== true)
    .map((d) => ({
      id: d.id,
      content: d.data.content ?? "",
      contentType: d.data.contentType ?? "text",
    }));
}

export async function deleteAllUserScans(userId: string): Promise<void> {
  try {
    const { docs } = await db.query(["users", userId, "scans"], {
      orderBy: { field: "scannedAt", direction: "desc" },
      limit: 500,
    });
    await Promise.all(
      docs.map((d) =>
        db.update(["users", userId, "scans", d.id], { isDeleted: true, deletedAt: db.timestamp() }).catch(() => {})
      )
    );
    // FIX #6: Trigger cleanup of old soft-deleted scans
    purgeOldSoftDeleteScans(userId).catch(() => {});
  } catch {}
}

// FIX #6: Cleanup function for soft-deleted scans (call periodically or after bulk deletes)
const SCAN_SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function purgeOldSoftDeleteScans(userId: string): Promise<void> {
  try {
    const { docs } = await db.query(["users", userId, "scans"], {
      orderBy: { field: "scannedAt", direction: "desc" },
      limit: 500,
    });
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const d of docs) {
      if (!d.data.isDeleted) continue;
      const deletedAt = d.data.deletedAt;
      let deletedAtMs = 0;
      if (deletedAt && typeof deletedAt === "object" && "toDate" in deletedAt) {
        deletedAtMs = (deletedAt as any).toDate().getTime();
      } else if (deletedAt && typeof deletedAt === "string") {
        deletedAtMs = new Date(deletedAt).getTime();
      }
      if (deletedAtMs > 0 && now - deletedAtMs > SCAN_SOFT_DELETE_TTL_MS) {
        toDelete.push(d.id);
      }
    }
    
    // Batch delete all expired soft-deleted scans
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(id => db.delete(["users", userId, "scans", id]).catch(() => {})));
    }
  } catch {}
}
