import { db, rtdb } from "../db";
import { tsToString } from "./utils";
import type { FollowerInfo } from "./types";

export type { FollowerInfo };

export async function isUserFollowingQrCode(qrId: string, userId: string): Promise<boolean> {
  const data = await db.get(["qrCodes", qrId, "followers", userId]);
  return data !== null;
}

export async function getFollowCount(qrId: string): Promise<number> {
  const { docs } = await db.query(["qrCodes", qrId, "followers"]);
  return docs.length;
}

export async function getQrFollowCount(qrId: string): Promise<number> {
  try {
    const { docs } = await db.query(["qrCodes", qrId, "followers"]);
    return docs.length;
  } catch { return 0; }
}

export async function toggleFollow(
  qrId: string,
  userId: string,
  content: string,
  contentType: string,
  followerDisplayName?: string
): Promise<{ isFollowing: boolean; followCount: number }> {
  const following = await isUserFollowingQrCode(qrId, userId);
  if (following) {
    await db.delete(["qrCodes", qrId, "followers", userId]);
    await db.delete(["users", userId, "following", qrId]);
  } else {
    await db.set(["qrCodes", qrId, "followers", userId], {
      userId, createdAt: db.timestamp(),
    });
    await db.set(["users", userId, "following", qrId], {
      qrCodeId: qrId, content, contentType, createdAt: db.timestamp(),
    });
    try {
      const qrData = await db.get(["qrCodes", qrId]);
      if (qrData?.ownerId && qrData.ownerId !== userId) {
        const ownerId = qrData.ownerId as string;
        const name = followerDisplayName || "Someone";
        await rtdb.push(`notifications/${ownerId}/items`, {
          type: "new_follow",
          qrCodeId: qrId,
          message: `${name} started following your QR code`,
          read: false,
          createdAt: Date.now(),
        });
      }
    } catch {}
  }
  const followCount = await getFollowCount(qrId);
  return { isFollowing: !following, followCount };
}

export async function getQrFollowersList(qrId: string): Promise<FollowerInfo[]> {
  try {
    const { docs } = await db.query(["qrCodes", qrId, "followers"]);
    const followers: FollowerInfo[] = [];
    await Promise.all(docs.map(async (d) => {
      const userId = d.data.userId || d.id;
      let displayName = "User";
      let username: string | null = null;
      let photoURL: string | null = null;
      try {
        const userData = await db.get(["users", userId]);
        if (userData) {
          displayName = userData.displayName || "User";
          username = userData.username || null;
          photoURL = userData.photoURL || null;
        }
      } catch {}
      followers.push({ userId, displayName, followedAt: tsToString(d.data.createdAt), username, photoURL });
    }));
    return followers.sort((a, b) => new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime());
  } catch { return []; }
}
