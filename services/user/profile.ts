import { db, rtdb } from "@/lib/db/client";
import { storageAdapter } from "@/lib/storage";
import { tsToString } from "../utils";
import type { UserStats } from "../types";
import { uploadBase64Image, deleteImage, deleteProfilePhoto } from "../storage/storage-service";
import { getCachedUserProfile, setCachedUserProfile } from "./cache";
import { COLLECTIONS } from "@/shared/constants/collections";

export type { UserStats };

export interface PrivacySettings {
  isPrivate: boolean;
  showQrCodes: boolean;
  showStats: boolean;
  showActivity: boolean;
  showRanking: boolean;
  showScanActivity: boolean;
}

export interface PublicProfile {
  userId: string;
  displayName: string;
  username: string;
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
  };
}

export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    let userDoc = getCachedUserProfile(userId);
    if (!userDoc) {
      userDoc = await db.get([COLLECTIONS.USERS, userId]);
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
      hasFollowingCount    ? Promise.resolve(null) : db.query([COLLECTIONS.USERS, userId, COLLECTIONS.FOLLOWING], { limit: COUNT_LIMIT }),
      hasPersonalScanCount ? Promise.resolve(null) : db.query([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS],     { limit: COUNT_LIMIT }),
      hasCommentCount      ? Promise.resolve(null) : db.query([COLLECTIONS.USERS, userId, COLLECTIONS.COMMENTS],  { limit: COUNT_LIMIT }),
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
    await db.update([COLLECTIONS.USERS, userId], { photoURL: photoURL ?? null });
  } catch {}
}

export async function updateUserProfilePhoto(
  userId: string,
  base64Data: string,
  oldPhotoUrl?: string | null
): Promise<string> {
  try {
    const newPhotoUrl = await uploadBase64Image(base64Data, "profile-photos", userId, true, 400, 0.8);
    // Only attempt deletion if the old URL belongs to Firebase Storage.
    if (oldPhotoUrl && storageAdapter.isOwnUrl(oldPhotoUrl)) {
      await deleteImage(oldPhotoUrl).catch(() => {});
    }
    await db.update([COLLECTIONS.USERS, userId], { photoURL: newPhotoUrl });
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
      data = await db.get([COLLECTIONS.USERS, userId]);
      if (data) setCachedUserProfile(userId, data);
    }
    return data?.photoURL || null;
  } catch {}
  return null;
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  try {
    const unameDoc = await db.get([COLLECTIONS.USERNAMES, username]);
    if (!unameDoc) return null;
    const userId = unameDoc.userId as string;

    let userDoc = getCachedUserProfile(userId);
    const qrResult = await db.query([COLLECTIONS.QR_CODES], {
      where: [{ field: "ownerId", op: "==", value: userId }],
      limit: 200,
    });

    if (!userDoc) {
      userDoc = await db.get([COLLECTIONS.USERS, userId]);
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
      },
    };
  } catch {
    return null;
  }
}

export async function getPublicQrCodes(userId: string): Promise<any[]> {
  try {
    const { docs } = await db.query([COLLECTIONS.USERS, userId, COLLECTIONS.GENERATED_QRS], {
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

export async function deleteUserAccount(userId: string): Promise<void> {
  let photoUrl: string | null = null;
  let username: string | null = null;
  try {
    const userDoc = await db.get([COLLECTIONS.USERS, userId]);
    photoUrl = userDoc?.photoURL || null;
    username = userDoc?.username || null;
  } catch {}

  // 1. Block access immediately — isDeleted gates all reads in the app
  await db.update([COLLECTIONS.USERS, userId], { isDeleted: true, deletedAt: db.timestamp() });

  // 2. Remove RTDB notifications (fast, synchronous)
  try { await rtdb.remove(`notifications/${userId}`); } catch {}

  // 3. Release username so another user can claim it
  if (username) {
    db.delete([COLLECTIONS.USERNAMES, username]).catch(() => {});
  }

  // 4. Delete profile photo from Storage.
  // Only delete if the URL belongs to our Firebase Storage bucket.
  if (photoUrl && storageAdapter.isOwnUrl(photoUrl)) {
    import("../storage/storage-service").then(({ deleteProfilePhoto }) => {
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
    const { docs } = await db.query([COLLECTIONS.USERS, userId, subcollection], { limit: batchSize });
    if (docs.length === 0) break;
    if (beforeDelete) await beforeDelete(docs).catch(() => {});
    await Promise.all(
      docs.map((d) => db.delete([COLLECTIONS.USERS, userId, subcollection, d.id]).catch(() => {}))
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
    _paginatedDelete(userId, COLLECTIONS.GENERATED_QRS, 200, async (docs) => {
      await Promise.all(
        docs.map((d) => {
          const qrCodeId = d.data.qrCodeId as string | undefined;
          if (!qrCodeId) return Promise.resolve();
          return db.update([COLLECTIONS.QR_CODES, qrCodeId], {
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
  db.delete([COLLECTIONS.USERS, userId]).catch(() => {});
}

async function _cleanupComments(userId: string): Promise<void> {
  let hasMore = true;
  while (hasMore) {
    const { docs } = await db.query([COLLECTIONS.USERS, userId, COLLECTIONS.COMMENTS], { limit: 200 });
    if (docs.length === 0) break;
    await Promise.all(
      docs.map(async (d) => {
        const { qrCodeId, commentId } = d.data;
        if (qrCodeId && commentId) {
          const batch = db.batch();
          batch.update([COLLECTIONS.QR_CODES, qrCodeId, COLLECTIONS.COMMENTS, commentId], {
            isDeleted: true,
            deletedAt: db.timestamp(),
            text: "[deleted]",
            userId: "[deleted]",
            userDisplayName: "[deleted]",
            userUsername: null,
            userPhotoURL: null,
          });
          batch.increment([COLLECTIONS.QR_CODES, qrCodeId], "commentCount", -1);
          batch.delete([COLLECTIONS.USERS, userId, COLLECTIONS.COMMENTS, d.id]);
          await batch.commit().catch(() => {});
        } else {
          await db.delete([COLLECTIONS.USERS, userId, COLLECTIONS.COMMENTS, d.id]).catch(() => {});
        }
      })
    );
    hasMore = docs.length === 200;
  }
}

async function _cleanupQrFollowing(userId: string): Promise<void> {
  const { docs } = await db.query([COLLECTIONS.USERS, userId, COLLECTIONS.FOLLOWING], { limit: 500 });
  await Promise.all(
    docs.map(async (d) => {
      const qrCodeId = d.id;
      try {
        const batch = db.batch();
        batch.delete([COLLECTIONS.QR_CODES, qrCodeId, COLLECTIONS.FOLLOWERS, userId]);
        batch.delete([COLLECTIONS.USERS, userId, COLLECTIONS.FOLLOWING, qrCodeId]);
        batch.increment([COLLECTIONS.QR_CODES, qrCodeId], "followerCount", -1);
        await batch.commit();
      } catch {}
    })
  );
}

async function _cleanupCreatorFollowing(userId: string): Promise<void> {
  const { docs } = await db.query([COLLECTIONS.USERS, userId, COLLECTIONS.CREATOR_FOLLOWING], { limit: 200 });
  await Promise.all(
    docs.map(async (d) => {
      const creatorId = d.id;
      try {
        const batch = db.batch();
        batch.delete([COLLECTIONS.USERS, creatorId, COLLECTIONS.CREATOR_FOLLOWERS, userId]);
        batch.delete([COLLECTIONS.USERS, userId, COLLECTIONS.CREATOR_FOLLOWING, creatorId]);
        batch.increment([COLLECTIONS.USERS, creatorId], "creatorFollowerCount", -1);
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
  await db.add([COLLECTIONS.FEEDBACK], { userId, email, message, createdAt: db.timestamp() });
}
