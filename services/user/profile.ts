import { db, rtdb } from "@/lib/db/client";
import { tsToString } from "../utils";
import type { UserStats } from "../types";
import { uploadBase64Image, deleteImage, deleteProfilePhoto } from "../storage-service";
import { getCachedUserProfile, setCachedUserProfile } from "./cache";

export type { UserStats };

export interface PrivacySettings {
  isPrivate: boolean;
  showQrCodes: boolean;
  showStats: boolean;
  showActivity: boolean;
  showRanking: boolean;
  showScanActivity: boolean;
  showFriendsCount: boolean;
}

export interface PublicProfile {
  userId: string;
  displayName: string;
  username: string;
  bio: string;
  photoURL: string | null;
  joinedAt: string | null;
  privacy: PrivacySettings;
  stats: {
    qrCount: number;
    totalScans: number;
    commentCount: number;
    totalLikesReceived: number;
    safeReportsGiven: number;
    personalScanCount: number;
    friendsCount: number;
  };
}

export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    let userDoc = getCachedUserProfile(userId);
    if (!userDoc) {
      userDoc = await db.get(["users", userId]);
      if (userDoc) setCachedUserProfile(userId, userDoc);
    }

    const hasPersonalScanCount = typeof userDoc?.personalScanCount === "number";
    const hasFollowingCount    = typeof userDoc?.followingCount    === "number";
    const hasCommentCount      = typeof userDoc?.commentCount      === "number";

    if (hasPersonalScanCount && hasFollowingCount && hasCommentCount) {
      return {
        followingCount: userDoc.followingCount,
        scanCount: userDoc.personalScanCount,
        commentCount: userDoc.commentCount,
        totalLikesReceived: userDoc?.totalLikesReceived || 0,
      };
    }

    // FIX: unbounded sub-collection queries used as fallback counters.
    // These are only triggered when the denormalized counter fields are missing
    // (e.g. old accounts). Add a generous limit so we don't scan the entire
    // collection — the count is capped at 1000 items for display purposes.
    const COUNT_LIMIT = 1000;
    const [followingResult, scansResult, commentsResult] = await Promise.all([
      hasFollowingCount    ? Promise.resolve(null) : db.query(["users", userId, "following"], { limit: COUNT_LIMIT }),
      hasPersonalScanCount ? Promise.resolve(null) : db.query(["users", userId, "scans"],     { limit: COUNT_LIMIT }),
      hasCommentCount      ? Promise.resolve(null) : db.query(["users", userId, "comments"],  { limit: COUNT_LIMIT }),
    ]);

    return {
      followingCount:       hasFollowingCount    ? userDoc.followingCount    : (followingResult?.docs.length ?? 0),
      scanCount:            hasPersonalScanCount ? userDoc.personalScanCount : (scansResult?.docs.length ?? 0),
      commentCount:         hasCommentCount      ? userDoc.commentCount      : (commentsResult?.docs.length ?? 0),
      totalLikesReceived:   userDoc?.totalLikesReceived || 0,
    };
  } catch {
    return { followingCount: 0, scanCount: 0, commentCount: 0, totalLikesReceived: 0 };
  }
}

export async function updateUserPhotoURL(userId: string, photoURL: string | null): Promise<void> {
  try {
    await db.update(["users", userId], { photoURL: photoURL ?? null });
  } catch {}
}

export async function updateUserProfilePhoto(
  userId: string,
  base64Data: string,
  oldPhotoUrl?: string | null
): Promise<string> {
  try {
    const newPhotoUrl = await uploadBase64Image(base64Data, "profile-photos", userId, true, 400, 0.8);
    if (oldPhotoUrl && oldPhotoUrl.includes("firebasestorage")) {
      await deleteImage(oldPhotoUrl).catch(() => {});
    }
    await db.update(["users", userId], { photoURL: newPhotoUrl });
    return newPhotoUrl;
  } catch (error: any) {
    console.error("[user-service] updateUserProfilePhoto failed:", error);
    throw error;
  }
}

export async function getUserPhotoURL(userId: string): Promise<string | null> {
  try {
    let data = getCachedUserProfile(userId);
    if (!data) {
      data = await db.get(["users", userId]);
      if (data) setCachedUserProfile(userId, data);
    }
    return data?.photoURL || null;
  } catch {}
  return null;
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  try {
    const unameDoc = await db.get(["usernames", username]);
    if (!unameDoc) return null;
    const userId = unameDoc.userId as string;

    let userDoc = getCachedUserProfile(userId);
    const qrResult = await db.query(["qrCodes"], {
      where: [{ field: "ownerId", op: "==", value: userId }],
      limit: 200,
    });

    if (!userDoc) {
      userDoc = await db.get(["users", userId]);
      if (userDoc) setCachedUserProfile(userId, userDoc);
    }
    if (!userDoc) return null;

    const privacy: PrivacySettings = {
      isPrivate:       userDoc.privacyIsPrivate    === true,
      showQrCodes:     userDoc.privacyShowQrCodes  !== false,
      showStats:       userDoc.privacyShowStats     !== false,
      showActivity:    userDoc.privacyShowActivity  !== false,
      showRanking:     userDoc.privacyShowRanking   !== false,
      showScanActivity: userDoc.privacyShowScanActivity !== false,
      showFriendsCount: userDoc.privacyShowFriendsCount !== false,
    };
    const totalScans = qrResult.docs.reduce((sum: number, d: any) => sum + (d.data.scanCount || 0), 0);
    let joinedAt: string | null = null;
    if (userDoc.createdAt) {
      try {
        joinedAt = userDoc.createdAt.toDate
          ? userDoc.createdAt.toDate().toISOString()
          : new Date(userDoc.createdAt).toISOString();
      } catch {}
    }

    return {
      userId,
      displayName: userDoc.displayName || username,
      username,
      bio: userDoc.bio || "",
      photoURL: userDoc.photoURL || null,
      joinedAt,
      privacy,
      stats: {
        qrCount: qrResult.docs.length,
        totalScans,
        commentCount: userDoc.commentCount || 0,
        totalLikesReceived: userDoc.totalLikesReceived || 0,
        safeReportsGiven: userDoc.safeReportsGiven || 0,
        personalScanCount: (userDoc.personalScanCount as number | undefined) ?? 0,
        friendsCount: (userDoc.friendsCount as number | undefined) ?? 0,
      },
    };
  } catch {
    return null;
  }
}

export async function getPublicQrCodes(userId: string): Promise<any[]> {
  try {
    const { docs } = await db.query(["users", userId, "generatedQrs"], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 20,
    });
    return docs
      .filter((d: any) => !d.data.privateMode)
      .map((d: any) => ({ id: d.id, ...d.data, createdAt: tsToString(d.data.createdAt) }));
  } catch {
    return [];
  }
}

export async function updateBio(userId: string, bio: string): Promise<void> {
  await db.update(["users", userId], { bio: bio.trim().slice(0, 150) });
}

export async function getUserBio(userId: string): Promise<string> {
  try {
    let doc = getCachedUserProfile(userId);
    if (!doc) {
      doc = await db.get(["users", userId]);
      if (doc) setCachedUserProfile(userId, doc);
    }
    return doc?.bio || "";
  } catch {
    return "";
  }
}

export async function deleteUserAccount(userId: string): Promise<void> {
  let photoUrl: string | null = null;
  let username: string | null = null;
  try {
    const userDoc = await db.get(["users", userId]);
    photoUrl = userDoc?.photoURL || null;
    username = userDoc?.username || null;
  } catch {}

  // 1. Block access immediately — isDeleted gates all reads in the app
  await db.update(["users", userId], { isDeleted: true, deletedAt: db.timestamp() });

  // 2. Remove RTDB notifications (fast, synchronous)
  try { await rtdb.remove(`notifications/${userId}`); } catch {}

  // 3. Release username so another user can claim it
  if (username) {
    db.delete(["usernames", username]).catch(() => {});
  }

  // 4. Delete profile photo from Storage
  if (photoUrl && photoUrl.includes("firebasestorage")) {
    import("../storage-service").then(({ deleteProfilePhoto }) => {
      deleteProfilePhoto(userId, photoUrl!).catch(() => {});
    }).catch(() => {});
  }

  // 5. Clean up all sub-collections and relational data in background.
  //    This is intentionally non-blocking — the auth account will be deleted
  //    by the caller immediately after this returns.
  _cleanupUserSubcollections(userId).catch(() => {});
}

async function _paginatedDelete(
  userId: string,
  subcollection: string,
  batchSize = 300,
  beforeDelete?: (docs: Array<{ id: string; data: Record<string, any> }>) => Promise<void>
): Promise<void> {
  let hasMore = true;
  while (hasMore) {
    const { docs } = await db.query(["users", userId, subcollection], { limit: batchSize });
    if (docs.length === 0) break;
    if (beforeDelete) await beforeDelete(docs).catch(() => {});
    await Promise.all(
      docs.map((d) => db.delete(["users", userId, subcollection, d.id]).catch(() => {}))
    );
    hasMore = docs.length === batchSize;
  }
}

async function _cleanupUserSubcollections(userId: string): Promise<void> {
  await Promise.allSettled([
    // Scan history — hard delete. QR scanCount on qrCodes is NEVER touched
    // (YouTube-style: counts belong to the QR, not the user).
    _paginatedDelete(userId, "scans"),

    // Generated QRs — remove user's private records and anonymize the global
    // qrCodes entry (strip owner identity, keep scanCount intact forever).
    _paginatedDelete(userId, "generatedQrs", 200, async (docs) => {
      await Promise.all(
        docs.map((d) => {
          const qrCodeId = d.data.qrCodeId as string | undefined;
          if (!qrCodeId) return Promise.resolve();
          return db.update(["qrCodes", qrCodeId], {
            ownerId: null,
            ownerName: "[deleted]",
            ownerLogoBase64: null,
            isOwnerDeleted: true,
          }).catch(() => {});
        })
      );
    }),

    // Favorites
    _paginatedDelete(userId, "favorites"),

    // Owner scans log and counted-scan dedup markers
    _paginatedDelete(userId, "ownerScans"),
    _paginatedDelete(userId, "countedScans"),

    // Comments — soft-delete comment text in qrCodes, delete user index entry
    _cleanupComments(userId),

    // QR follows — remove from qrCodes/{qrId}/followers and decrement counts
    _cleanupQrFollowing(userId),

    // Creator follows — remove from the creator's creatorFollowers sub-collection
    _cleanupCreatorFollowing(userId),
  ]);

  // Hard-delete the user document itself last (after all sub-collections are gone)
  db.delete(["users", userId]).catch(() => {});
}

async function _cleanupComments(userId: string): Promise<void> {
  let hasMore = true;
  while (hasMore) {
    const { docs } = await db.query(["users", userId, "comments"], { limit: 200 });
    if (docs.length === 0) break;
    await Promise.all(
      docs.map(async (d) => {
        const { qrCodeId, commentId } = d.data;
        if (qrCodeId && commentId) {
          const batch = db.batch();
          batch.update(["qrCodes", qrCodeId, "comments", commentId], {
            isDeleted: true,
            deletedAt: db.timestamp(),
            text: "[deleted]",
            userId: "[deleted]",
            userDisplayName: "[deleted]",
            userUsername: null,
            userPhotoURL: null,
          });
          batch.increment(["qrCodes", qrCodeId], "commentCount", -1);
          batch.delete(["users", userId, "comments", d.id]);
          await batch.commit().catch(() => {});
        } else {
          await db.delete(["users", userId, "comments", d.id]).catch(() => {});
        }
      })
    );
    hasMore = docs.length === 200;
  }
}

async function _cleanupQrFollowing(userId: string): Promise<void> {
  const { docs } = await db.query(["users", userId, "following"], { limit: 500 });
  await Promise.all(
    docs.map(async (d) => {
      const qrCodeId = d.id;
      try {
        const batch = db.batch();
        batch.delete(["qrCodes", qrCodeId, "followers", userId]);
        batch.delete(["users", userId, "following", qrCodeId]);
        batch.increment(["qrCodes", qrCodeId], "followerCount", -1);
        await batch.commit();
      } catch {}
    })
  );
}

async function _cleanupCreatorFollowing(userId: string): Promise<void> {
  const { docs } = await db.query(["users", userId, "creatorFollowing"], { limit: 200 });
  await Promise.all(
    docs.map(async (d) => {
      const creatorId = d.id;
      try {
        const batch = db.batch();
        batch.delete(["users", creatorId, "creatorFollowers", userId]);
        batch.delete(["users", userId, "creatorFollowing", creatorId]);
        batch.increment(["users", creatorId], "creatorFollowerCount", -1);
        await batch.commit();
      } catch {}
    })
  );
}

export async function submitFeedback(
  userId: string | null,
  email: string | null,
  message: string
): Promise<void> {
  await db.add(["feedback"], { userId, email, message, createdAt: db.timestamp() });
}
