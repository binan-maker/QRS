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

export async function isUserFollowingCreator(creatorId: string, userId: string): Promise<boolean> {
  const data = await db.get([COLLECTIONS.USERS, creatorId, COLLECTIONS.CREATOR_FOLLOWERS, userId]);
  return data !== null;
}

export async function getCreatorFollowerCount(creatorId: string): Promise<number> {
  try {
    const userData = await db.get([COLLECTIONS.PUBLIC_PROFILES, creatorId]);
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
    batch.delete([COLLECTIONS.USERS, creatorId, COLLECTIONS.CREATOR_FOLLOWERS, userId]);
    batch.delete([COLLECTIONS.USERS, userId, COLLECTIONS.CREATOR_FOLLOWING, creatorId]);
    batch.increment([COLLECTIONS.USERS, creatorId], "creatorFollowerCount", -1);
    // FIX: also decrement the follower's own creatorFollowingCount so profile
    // stats stay accurate. Previously only the creator's side was updated.
    batch.increment([COLLECTIONS.USERS, userId], "creatorFollowingCount", -1);
  } else {
    batch.set([COLLECTIONS.USERS, creatorId, COLLECTIONS.CREATOR_FOLLOWERS, userId], {
      followerId: userId, createdAt: db.timestamp(),
    });
    batch.set([COLLECTIONS.USERS, userId, COLLECTIONS.CREATOR_FOLLOWING, creatorId], {
      creatorId, creatorName: creatorName || "", createdAt: db.timestamp(),
    });
    batch.increment([COLLECTIONS.USERS, creatorId], "creatorFollowerCount", 1);
    // FIX: increment the follower's own creatorFollowingCount to mirror
    // the QR follow pattern (which increments the follower's followingCount).
    batch.increment([COLLECTIONS.USERS, userId], "creatorFollowingCount", 1);
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
    // FIX: unbounded query — cap at 100 to prevent full collection scan
    const { docs } = await db.query([COLLECTIONS.USERS, creatorId, COLLECTIONS.CREATOR_FOLLOWERS], { limit: 100 });
    const followers: FollowerInfo[] = [];
    await Promise.all(docs.map(async (d) => {
      const followerId = d.data.followerId || d.id;
      let displayName = "User";
      let username: string | null = null;
      let photoURL: string | null = null;
      try {
        const userData = await db.get([COLLECTIONS.PUBLIC_PROFILES, followerId]);
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