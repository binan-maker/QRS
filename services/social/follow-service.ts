import { db, rtdb } from "@/lib/db/client";
import { NOTIFICATIONS_ENABLED } from "../notifications/config";
import { tsToString } from "../utils";
import type { FollowerInfo } from "../types";
import { COLLECTIONS } from "@/shared/constants/collections";

export type { FollowerInfo };

export async function isUserFollowingQrCode(qrId: string, userId: string): Promise<boolean> {
  const data = await db.get([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.FOLLOWERS, userId]);
  return data !== null;
}

export async function getFollowCount(qrId: string): Promise<number> {
  try {
    const qrData = await db.get([COLLECTIONS.QR_CODES, qrId]);
    return typeof qrData?.followerCount === "number" ? qrData.followerCount : 0;
  } catch { return 0; }
}

export async function getQrFollowCount(qrId: string): Promise<number> {
  return getFollowCount(qrId);
}

export async function toggleFollow(
  qrId: string,
  userId: string,
  content: string,
  contentType: string,
  followerDisplayName?: string
): Promise<{ isFollowing: boolean; followCount: number }> {
  const following = await isUserFollowingQrCode(qrId, userId);

  const batch = db.batch();

  if (following) {
    batch.delete([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.FOLLOWERS, userId]);
    batch.delete([COLLECTIONS.USERS, userId, COLLECTIONS.FOLLOWING, qrId]);
    batch.increment([COLLECTIONS.USERS, userId], "followingCount", -1);
    batch.increment([COLLECTIONS.QR_CODES, qrId], "followerCount", -1);
  } else {
    batch.set([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.FOLLOWERS, userId], {
      userId, createdAt: db.timestamp(),
    });
    batch.set([COLLECTIONS.USERS, userId, COLLECTIONS.FOLLOWING, qrId], {
      qrCodeId: qrId, content, contentType, createdAt: db.timestamp(),
    });
    batch.increment([COLLECTIONS.USERS, userId], "followingCount", 1);
    batch.increment([COLLECTIONS.QR_CODES, qrId], "followerCount", 1);
  }

  await batch.commit();

  if (!following && NOTIFICATIONS_ENABLED) {
    try {
      const qrData = await db.get([COLLECTIONS.QR_CODES, qrId]);
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
    // FIX: unbounded query — cap at 100 to prevent full collection scan
    const { docs } = await db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.FOLLOWERS], { limit: 100 });
    const followers: FollowerInfo[] = [];
    await Promise.all(docs.map(async (d) => {
      const userId = d.data.userId || d.id;
      let displayName = "User";
      let username: string | null = null;
      let photoURL: string | null = null;
      try {
        const userData = await db.get([COLLECTIONS.PUBLIC_PROFILES, userId]);
        if (userData) {
          displayName = userData.displayName || "User";
          username = userData.username || null;
          photoURL = userData.photoURL || null;
        }
      } catch {}
      followers.push({ userId, followerId: userId, followerName: displayName, displayName, followedAt: tsToString(d.data.createdAt), username, photoURL });
    }));
    return followers.sort((a, b) => new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime());
  } catch { return []; }
}