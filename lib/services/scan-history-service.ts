// ─── Scan History Service ─────────────────────────────────────────────────────
// Single responsibility: recording and retrieving user scan history.
// Privacy guarantee: signed-in users in anonymous mode → zero database writes.

import { db, rtdb } from "../db/client";
import { tsToString } from "./utils";
import {
  collection,
  query,
  where,
  getCountFromServer,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { firestore } from "../firebase";

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
  const scansCol = collection(firestore, "users", userId, "scans");

  const [totalSnap, urlSnap, textSnap, paySnap, camSnap, galSnap] = await Promise.all([
    getCountFromServer(query(scansCol)),
    getCountFromServer(query(scansCol, where("contentType", "==", "url"))),
    getCountFromServer(query(scansCol, where("contentType", "==", "text"))),
    getCountFromServer(query(scansCol, where("contentType", "==", "payment"))),
    getCountFromServer(query(scansCol, where("scanSource", "==", "camera"))),
    getCountFromServer(query(scansCol, where("scanSource", "==", "gallery"))),
  ]);

  const total    = totalSnap.data().count;
  const byUrl    = urlSnap.data().count;
  const byText   = textSnap.data().count;
  const byPayment = paySnap.data().count;
  const byOther  = Math.max(0, total - byUrl - byText - byPayment);
  const byCamera = camSnap.data().count;
  const byGallery = galSnap.data().count;

  return { total, byUrl, byText, byPayment, byOther, byCamera, byGallery };
}

export async function getUserAllScansForStats(userId: string): Promise<Array<{ id: string; content: string; contentType: string }>> {
  const scansCol = collection(firestore, "users", userId, "scans");
  const q = query(scansCol, orderBy("scannedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.data().isDeleted !== true)
    .map((d) => ({
      id: d.id,
      content: d.data().content ?? "",
      contentType: d.data().contentType ?? "text",
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
  } catch {}
}
