import { db, rtdb } from "@/lib/db/client";
import { NOTIFICATIONS_ENABLED } from "./notifications/config";
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
    await db.increment(["users", userId], "followingCount", -1);
  } else {
    await db.set(["qrCodes", qrId, "followers", userId], {
      userId, createdAt: db.timestamp(),
    });
    await db.set(["users", userId, "following", qrId], {
      qrCodeId: qrId, content, contentType, createdAt: db.timestamp(),
    });
    await db.increment(["users", userId], "followingCount", 1);
    if (NOTIFICATIONS_ENABLED) {
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
  }
  const followCount = await getFollowCount(qrId);
  return { isFollowing: !following, followCount };
}

export async function isUserFollowingCreator(creatorId: string, userId: string): Promise<boolean> {
  const data = await db.get(["users", creatorId, "creatorFollowers", userId]);
  return data !== null;
}

export async function getCreatorFollowerCount(creatorId: string): Promise<number> {
  try {
    const userData = await db.get(["users", creatorId]);
    if (typeof userData?.creatorFollowerCount === "number") return userData.creatorFollowerCount;
    const { docs } = await db.query(["users", creatorId, "creatorFollowers"]);
    return docs.length;
  } catch { return 0; }
}

export async function toggleFollowCreator(
  creatorId: string,
  userId: string,
  followerDisplayName?: string,
  creatorName?: string
): Promise<{ isFollowing: boolean; followerCount: number }> {
  const following = await isUserFollowingCreator(creatorId, userId);
  if (following) {
    await db.delete(["users", creatorId, "creatorFollowers", userId]);
    await db.delete(["users", userId, "creatorFollowing", creatorId]);
    await db.increment(["users", creatorId], "creatorFollowerCount", -1);
  } else {
    await db.set(["users", creatorId, "creatorFollowers", userId], {
      followerId: userId, createdAt: db.timestamp(),
    });
    await db.set(["users", userId, "creatorFollowing", creatorId], {
      creatorId, creatorName: creatorName || "", createdAt: db.timestamp(),
    });
    await db.increment(["users", creatorId], "creatorFollowerCount", 1);
    if (NOTIFICATIONS_ENABLED) {
      try {
        if (creatorId !== userId) {
          const name = followerDisplayName || "Someone";
          await rtdb.push(`notifications/${creatorId}/items`, {
            type: "new_creator_follow",
            followerId: userId,
            message: `${name} started following you`,
            read: false,
            createdAt: Date.now(),
          });
        }
      } catch {}
    }
  }
  const followerCount = await getCreatorFollowerCount(creatorId);
  return { isFollowing: !following, followerCount };
}

export async function getCreatorFollowersList(creatorId: string): Promise<FollowerInfo[]> {
  try {
    const { docs } = await db.query(["users", creatorId, "creatorFollowers"]);
    const followers: FollowerInfo[] = [];
    await Promise.all(docs.map(async (d) => {
      const followerId = d.data.followerId || d.id;
      let displayName = "User";
      let username: string | null = null;
      let photoURL: string | null = null;
      try {
        const userData = await db.get(["users", followerId]);
        if (userData) {
          displayName = userData.displayName || "User";
          username = userData.username || null;
          photoURL = userData.photoURL || null;
        }
      } catch {}
      followers.push({
        userId: followerId, followerId, followerName: displayName,
        displayName, followedAt: tsToString(d.data.createdAt),
        username, photoURL, isMutual: false,
      });
    }));
    return followers.sort((a, b) => new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime());
  } catch { return []; }
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
      followers.push({ userId, followerId: userId, followerName: displayName, displayName, followedAt: tsToString(d.data.createdAt), username, photoURL });
    }));
    return followers.sort((a, b) => new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime());
  } catch { return []; }
}
