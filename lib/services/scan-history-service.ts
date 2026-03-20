// ─── Scan History Service ─────────────────────────────────────────────────────
// Single responsibility: recording and retrieving user scan history.
// Privacy guarantee: signed-in users in anonymous mode → zero database writes.

import { db, rtdb } from "../db";
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
  const items = hasMore ? docs.slice(0, pageSize) : docs;
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
  } catch {}
}
