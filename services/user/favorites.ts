import { db } from "@/lib/db/client";
import { tsToString } from "../utils";

export async function isUserFavorite(qrId: string, userId: string): Promise<boolean> {
  const data = await db.get(["users", userId, "favorites", qrId]);
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
    await db.delete(["users", userId, "favorites", qrId]);
  } else {
    await db.set(["users", userId, "favorites", qrId], {
      qrCodeId: qrId, content, contentType, createdAt: db.timestamp(),
    });
  }
  return !isFav;
}

export async function getUserFavorites(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    ["users", userId, "favorites"],
    { orderBy: { field: "createdAt", direction: "desc" } }
  );
  return docs.map((d) => ({ id: d.id, ...d.data, createdAt: tsToString(d.data.createdAt) }));
}

export async function getUserFollowing(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    ["users", userId, "following"],
    { orderBy: { field: "createdAt", direction: "desc" } }
  );
  return docs.map((d) => ({ id: d.id, ...d.data, createdAt: tsToString(d.data.createdAt) }));
}
