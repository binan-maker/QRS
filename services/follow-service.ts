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
  try {
    const qrData = await db.get(["qrCodes", qrId]);
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
    batch.delete(["qrCodes", qrId, "followers", userId]);
    batch.delete(["users", userId, "following", qrId]);
    batch.increment(["users", userId], "followingCount", -1);
    batch.increment(["qrCodes", qrId], "followerCount", -1);
  } else {
    batch.set(["qrCodes", qrId, "followers", userId], {
      userId, createdAt: db.timestamp(),
    });
    batch.set(["users", userId, "following", qrId], {
      qrCodeId: qrId, content, contentType, createdAt: db.timestamp(),
    });
    batch.increment(["users", userId], "followingCount", 1);
    batch.increment(["qrCodes", qrId], "followerCount", 1);
  }

  await batch.commit();

  if (!following && NOTIFICATIONS_ENABLED) {
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

export async function isUserFollowingCreator(creatorId: string, userId: string): Promise<boolean> {
  const data = await db.get(["users", creatorId, "creatorFollowers", userId]);
  return data !== null;
}

export async function getCreatorFollowerCount(creatorId: string): Promise<number> {
  try {
    const userData = await db.get(["users", creatorId]);
    return typeof userData?.creatorFollowerCount === "number" ? userData.creatorFollowerCount : 0;
  } catch { return 0; }
}

export async function toggleFollowCreator(
  creatorId: string,
  userId: string,
  followerDisplayName?: string,
  creatorName?: string
): Promise<{ isFollowing: boolean; followerCount: number }> {
  const following = await isUserFollowingCreator(creatorId, userId);

  const batch = db.batch();

  if (following) {
    batch.delete(["users", creatorId, "creatorFollowers", userId]);
    batch.delete(["users", userId, "creatorFollowing", creatorId]);
    batch.increment(["users", creatorId], "creatorFollowerCount", -1);
  } else {
    batch.set(["users", creatorId, "creatorFollowers", userId], {
      followerId: userId, createdAt: db.timestamp(),
    });
    batch.set(["users", userId, "creatorFollowing", creatorId], {
      creatorId, creatorName: creatorName || "", createdAt: db.timestamp(),
    });
    batch.increment(["users", creatorId], "creatorFollowerCount", 1);
  }

  await batch.commit();

  if (!following && NOTIFICATIONS_ENABLED) {
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
