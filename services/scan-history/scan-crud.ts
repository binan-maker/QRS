import { db } from "@/lib/db/client";
import { tsToString } from "../utils";
import { incrementSmartCounter } from "@/lib/db/distributed-counter";
import {
  checkScanAllowed,
  recordOwnerScan,
  recordBlockedScan,
} from "../scan-fraud-guard";

const SCAN_SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateDocId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export async function recordScan(
  qrId: string,
  content: string,
  contentType: string,
  userId: string | null,
  isAnonymous: boolean,
  scanSource: "camera" | "gallery" | "viewed" = "camera"
): Promise<void> {
  if (userId && isAnonymous) return;

  // Write velocity event to Firestore (unified — no RTDB dependency).
  try {
    await db.add(["qrCodes", qrId, "scanVelocity"], { ts: Date.now() });
  } catch {}

  let countThisScan = true;
  try {
    const qrData = await db.get(["qrCodes", qrId]);
    const qrOwnerId = qrData?.ownerId ?? null;

    const guard = await checkScanAllowed(qrId, userId, qrOwnerId);

    if (!guard.allowed) {
      countThisScan = false;

      if (guard.ownerScan && userId) {
        await recordOwnerScan(qrId, userId);
      } else {
        await recordBlockedScan(qrId, guard.reason, userId);
      }
    }

    if (qrData?.scanCountFrozen) {
      countThisScan = false;
    }

    if (countThisScan) {
      const currentScanCount = qrData?.scanCount ?? 0;
      await incrementSmartCounter(qrId, currentScanCount, 1);
    }
  } catch (e) {
    console.warn("[db] recordScan: failed to check/increment scanCount:", e);
  }

  if (userId && !isAnonymous) {
    try {
      // Atomically write the scan record and increment personalScanCount together
      // so the counter never drifts from the actual number of stored scan documents.
      const scanId = generateDocId();
      const batch = db.batch();
      batch.set(["users", userId, "scans", scanId], {
        qrCodeId: qrId,
        content,
        contentType,
        isAnonymous: false,
        scannedAt: db.timestamp(),
        scanSource,
        counted: countThisScan,
      });
      if (countThisScan) {
        batch.increment(["users", userId], "personalScanCount", 1);
      }
      await batch.commit();
    } catch {}
  }
}

export async function getUserScans(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    ["users", userId, "scans"],
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
  const { docs, cursor: newCursor } = await db.query(
    ["users", userId, "scans"],
    { orderBy: { field: "scannedAt", direction: "desc" }, limit: pageSize + 1, cursor }
  );
  const hasMore = docs.length > pageSize;
  const sliced = hasMore ? docs.slice(0, pageSize) : docs;
  const items = sliced.filter((d) => d.data.isDeleted !== true);
  return {
    items: items.map((d) => ({ id: d.id, ...d.data, scannedAt: tsToString(d.data.scannedAt) })),
    cursor: items.length > 0 ? newCursor : null,
    hasMore,
  };
}

export async function deleteUserScan(userId: string, scanId: string): Promise<void> {
  try {
    const batch = db.batch();
    batch.update(["users", userId, "scans", scanId], { isDeleted: true, deletedAt: db.timestamp() });
    batch.increment(["users", userId], "personalScanCount", -1);
    await batch.commit();
  } catch {}
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
    if (softDeleteCount > 0) {
      await db.increment(["users", userId], "personalScanCount", -softDeleteCount);
    }
    purgeOldSoftDeleteScans(userId).catch(() => {});
  } catch {}
}

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

    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(id => db.delete(["users", userId, "scans", id]).catch(() => {})));
    }
  } catch {}
}

export async function hardDeleteOldSoftDeleteScans(): Promise<void> {
  const now = Date.now();
  let totalDeleted = 0;

  try {
    const { docs: userDocs } = await db.query(["users"], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 500,
    });

    for (const userDoc of userDocs) {
      const userId = userDoc.id;
      const { docs: scanDocs } = await db.query(["users", userId, "scans"], {
        orderBy: { field: "scannedAt", direction: "desc" },
        limit: 200,
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
