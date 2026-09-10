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

