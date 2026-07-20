import { db } from "@/lib/db/client";
import { tsToString } from "../utils";
import { incrementSmartCounter } from "@/lib/db/distributed-counter";
import {
  checkScanAllowed,
  recordOwnerScan,
  recordBlockedScan,
} from "../scan-fraud-guard";
import { trackQrScanned } from "@/lib/analytics";
import { COLLECTIONS } from "@/shared/constants/collections";
import { logger } from "@/shared/utils/logger";

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
    await db.add([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.SCAN_VELOCITY], { ts: Date.now() });
  } catch {}

  let countThisScan = true;
  try {
    const qrData = await db.get([COLLECTIONS.QR_CODES, qrId]);
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

  // Track every scan regardless of auth state — QR type, verdict, and source
  // are the signals we care about (no PII involved).
  trackQrScanned({
    contentType,
    verdict: countThisScan ? "safe" : "flagged",
    scanSource,
    isAuthenticated: !!(userId && !isAnonymous),
  });

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
        scanSource,
        counted: countThisScan,
      });
      if (countThisScan) {
        batch.increment([COLLECTIONS.USERS, userId], "personalScanCount", 1);
      }
      await batch.commit();
    } catch {}
  }

  // FIX (scanVelocity unbounded growth): the scanVelocity sub-collection collects
  // one document per scan and is queried with a 24h window filter. Without cleanup
  // it grows forever. Probabilistically prune entries older than 48h after ~5% of
  // scans so cleanup is distributed across all scans without adding latency to most.
  if (Math.random() < 0.05) {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.SCAN_VELOCITY], {
      where: [{ field: "ts", op: "<", value: cutoff }],
      limit: 100,
    }).then(({ docs }) => {
      if (docs.length === 0) return;
      Promise.all(
        docs.map((d) => db.delete([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.SCAN_VELOCITY, d.id]).catch(() => {}))
      ).catch(() => {});
    }).catch(() => {});
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

export async function deleteUserScan(userId: string, scanId: string): Promise<void> {
  try {
    const batch = db.batch();
    batch.update([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS, scanId], { isDeleted: true, deletedAt: db.timestamp() });
    batch.increment([COLLECTIONS.USERS, userId], "personalScanCount", -1);
    await batch.commit();
  } catch {}
}

export async function deleteAllUserScans(userId: string): Promise<void> {
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
    purgeOldSoftDeleteScans(userId).catch(() => {});
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
        await Promise.all(toDelete.map(id => db.delete([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS, id]).catch(() => {})));
        totalDeleted += toDelete.length;
      }
    }

    logger.log(`[cleanup] hardDeleteOldSoftDeleteScans: Deleted ${totalDeleted} old soft-deleted scans`);
  } catch (e) {
    console.error("[cleanup] hardDeleteOldSoftDeleteScans failed:", e);
  }
}
