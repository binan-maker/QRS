// ─── Scan History Service ─────────────────────────────────────────────────────
// Single responsibility: recording and retrieving user scan history.
// Privacy guarantee: signed-in users in anonymous mode → zero database writes.
//
// Fraud prevention: Integrated with ScanFraudGuard — YouTube-style deduplication,
// owner-scan separation, velocity detection, and statistical anomaly freezing.

import { db, rtdb } from "../db/client";
import { tsToString } from "./utils";
import { incrementSmartCounter, getDistributedCounter } from "../db/distributed-counter";
import {
  checkScanAllowed,
  recordOwnerScan,
  recordBlockedScan,
} from "./scan-fraud-guard";

export async function recordScan(
  qrId: string,
  content: string,
  contentType: string,
  userId: string | null,
  isAnonymous: boolean,
  scanSource: "camera" | "gallery" | "viewed" = "camera"
): Promise<void> {
  // Signed-in users in anonymous mode: absolute zero database interaction.
  // This is a privacy and legal compliance requirement.
  if (userId && isAnonymous) return;

  // ── Always push to RTDB velocity tracker first (used by fraud guard below)
  try {
    await rtdb.push(`qrScanVelocity/${qrId}`, { ts: Date.now() });
  } catch {}

  // ── Fraud guard — YouTube-style multi-layer check ─────────────────────────
  let countThisScan = true;
  try {
    const qrData = await db.get(["qrCodes", qrId]);
    const qrOwnerId = qrData?.ownerId ?? null;

    // Skip fraud guard for "viewed" page visits — only guard actual scans
    if (scanSource !== "viewed") {
      const guard = await checkScanAllowed(qrId, userId, qrOwnerId);

      if (!guard.allowed) {
        countThisScan = false;

        if (guard.ownerScan && userId) {
          // Owner scanning their own code — record separately, don't inflate public count
          await recordOwnerScan(qrId, userId);
        } else {
          // Blocked scan — log for analytics without affecting public counter
          await recordBlockedScan(qrId, guard.reason, userId);
        }
      }

      // If already frozen by anomaly detection, don't count regardless
      if (qrData?.scanCountFrozen) {
        countThisScan = false;
      }
    }

    // ── Increment public scanCount only for legitimate, non-duplicate scans ──
    if (countThisScan) {
      const currentScanCount = qrData?.scanCount ?? 0;
      await incrementSmartCounter(qrId, currentScanCount, 1);
    }
  } catch (e) {
    console.warn("[db] recordScan: failed to increment scanCount:", e);
    // Fallback: count it to avoid under-counting on errors
    try {
      await db.increment(["qrCodes", qrId], "scanCount", 1);
    } catch {}
  }

  // ── Personal scan history — always record regardless of fraud guard ────────
  // (The user did scan it — it just doesn't inflate the public count)
  if (userId && !isAnonymous) {
    try {
      await db.add(["users", userId, "scans"], {
        qrCodeId: qrId,
        content,
        contentType,
        isAnonymous: false,
        scannedAt: db.timestamp(),
        scanSource,
        counted: countThisScan, // audit field — was this scan publicly counted?
      });
      // Only increment personal stat counter for counted scans
      if (countThisScan) {
        await db.increment(["users", userId], "personalScanCount", 1);
      }
    } catch {}
  }
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
    // FIX #5 BONUS: Decrement cached personalScanCount when scan is deleted
    await db.increment(["users", userId], "personalScanCount", -1);
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
  // OPTIMIZATION: Use embedded stats counters from user document when available
  // Falls back to query only if stats are missing (legacy users)
  try {
    const userDoc = await db.get(["users", userId]);
    const userData = userDoc?.data || {};
    
    // If embedded stats exist (from FIX #5), use them directly - ZERO additional reads
    if (userData.personalScanCount !== undefined) {
      return {
        total: userData.personalScanCount || 0,
        byUrl: userData.scanCountByUrl || 0,
        byText: userData.scanCountByText || 0,
        byPayment: userData.scanCountByPayment || 0,
        byOther: (userData.personalScanCount || 0) - 
                 ((userData.scanCountByUrl || 0) + 
                  (userData.scanCountByText || 0) + 
                  (userData.scanCountByPayment || 0)),
        byCamera: userData.scanCountByCamera || 0,
        byGallery: userData.scanCountByGallery || 0,
      };
    }
  } catch (e) {
    console.warn("Failed to fetch user stats, falling back to query:", e);
  }
  
  // Fallback for legacy users without embedded stats (will be rare after migration)
  // Uses pagination to avoid memory limits on users with many scans
  let total = 0, byUrl = 0, byText = 0, byPayment = 0, byOther = 0, byCamera = 0, byGallery = 0;
  let cursor: any = undefined;
  
  do {
    const { docs, cursor: nextCursor } = await db.query(["users", userId, "scans"], { 
      limit: 1000,
      cursor 
    });
    cursor = nextCursor;
    
    for (const d of docs) {
      const data = d.data;
      total++;
      
      if (data.contentType === "url") byUrl++;
      else if (data.contentType === "text") byText++;
      else if (data.contentType === "payment") byPayment++;
      else byOther++;
      
      if (data.scanSource === "camera") byCamera++;
      else if (data.scanSource === "gallery") byGallery++;
    }
  } while (cursor);
  
  return { total, byUrl, byText, byPayment, byOther, byCamera, byGallery };
}

export async function getUserAllScansForStats(userId: string): Promise<Array<{ id: string; content: string; contentType: string }>> {
  // OPTIMIZATION: This function is only used for analysis features.
  // For users with many scans, use pagination to avoid memory/timeout issues.
  const allScans: Array<{ id: string; content: string; contentType: string }> = [];
  let cursor: any = undefined;
  
  do {
    const { docs, cursor: nextCursor } = await db.query(
      ["users", userId, "scans"], 
      { 
        orderBy: { field: "scannedAt", direction: "desc" }, 
        limit: 500,
        cursor
      }
    );
    cursor = nextCursor;
    
    const filtered = docs
      .filter((d) => d.data.isDeleted !== true)
      .map((d) => ({
        id: d.id,
        content: d.data.content ?? "",
        contentType: d.data.contentType ?? "text",
      }));
    
    allScans.push(...filtered);
    
    // Stop early if we have enough for analysis (prevent runaway queries)
    if (allScans.length >= 2000) break;
  } while (cursor);
  
  return allScans;
}

export async function deleteAllUserScans(userId: string): Promise<void> {
  try {
    const { docs } = await db.query(["users", userId, "scans"], {
      orderBy: { field: "scannedAt", direction: "desc" },
      limit: 500,
    });
    const softDeleteCount = docs.length;
    await Promise.all(
      docs.map((d) =>
        db.update(["users", userId, "scans", d.id], { isDeleted: true, deletedAt: db.timestamp() }).catch(() => {})
      )
    );
    // FIX #5 BONUS: Decrement cached personalScanCount by the number of scans being soft-deleted
    if (softDeleteCount > 0) {
      await db.increment(["users", userId], "personalScanCount", -softDeleteCount);
    }
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

// FIX #6 BONUS: Global cleanup function for scheduled Cloud Function (runs across all users)
export async function hardDeleteOldSoftDeleteScans(): Promise<void> {
  const now = Date.now();
  let totalDeleted = 0;
  
  try {
    // Query all users (in production, use pagination)
    const { docs: userDocs } = await db.query(["users"], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 500, // Process up to 500 users per run
    });
    
    for (const userDoc of userDocs) {
      const userId = userDoc.id;
      const { docs: scanDocs } = await db.query(["users", userId, "scans"], {
        orderBy: { field: "scannedAt", direction: "desc" },
        limit: 200, // Check up to 200 scans per user
      });
      
      const toDelete: string[] = [];
      for (const d of scanDocs) {
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
      
      // Batch delete expired soft-deleted scans
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(id => db.delete(["users", userId, "scans", id]).catch(() => {})));
        totalDeleted += toDelete.length;
      }
    }
    
    console.log(`[cleanup] hardDeleteOldSoftDeleteScans: Deleted ${totalDeleted} old soft-deleted scans`);
  } catch (e) {
    console.error("[cleanup] hardDeleteOldSoftDeleteScans failed:", e);
  }
}

