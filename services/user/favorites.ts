import { db } from "@/lib/db/client";
import { tsToString } from "../utils";
import { COLLECTIONS } from "@/shared/constants/collections";

export async function isUserFavorite(qrId: string, userId: string): Promise<boolean> {
  const data = await db.get([COLLECTIONS.USERS, userId, COLLECTIONS.FAVORITES, qrId]);
  return data !== null;
}

export async function toggleFavorite(
  qrId: string,
  userId: string,
  content: string,
  contentType: string
): Promise<boolean> {
  const isFav = await isUserFavorite(qrId, userId);
  if (isFav) {
    await db.delete([COLLECTIONS.USERS, userId, COLLECTIONS.FAVORITES, qrId]);
  } else {
    await db.set([COLLECTIONS.USERS, userId, COLLECTIONS.FAVORITES, qrId], {
      qrCodeId: qrId, content, contentType, createdAt: db.timestamp(),
    });
  }
  return !isFav;
}

export async function getUserFavorites(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    [COLLECTIONS.USERS, userId, COLLECTIONS.FAVORITES],
    { orderBy: { field: "createdAt", direction: "desc" } }
  );
  return docs.map((d) => ({ id: d.id, ...d.data, createdAt: tsToString(d.data.createdAt) }));
}

// FIX: Added `limit` param (default 200) to prevent unbounded Firestore reads
// for users who follow large numbers of QR codes. 200 covers all practical cases
// in the Settings following list without risking a full collection scan.
export async function getUserFollowing(userId: string, limit = 200): Promise<any[]> {
  const { docs } = await db.query(
    [COLLECTIONS.USERS, userId, COLLECTIONS.FOLLOWING],
    { orderBy: { field: "createdAt", direction: "desc" }, limit }
  );
  return docs.map((d) => ({ id: d.id, ...d.data, createdAt: tsToString(d.data.createdAt) }));
}
