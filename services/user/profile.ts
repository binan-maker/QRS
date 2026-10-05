import { db } from "@/lib/db/client";
import { supabase, SUPABASE_TABLES, SUPABASE_BUCKETS } from "@/lib/supabase";
import { storageAdapter } from "@/lib/storage";
import { tsToString } from "../utils";
import type { UserStats } from "../types";
import { uploadBase64Image, deleteImage } from "../storage/storage-service";
import { getCachedUserProfile, setCachedUserProfile, clearUserProfileCache } from "./cache";
import { COLLECTIONS } from "@/shared/constants/collections";
import {
  isUserUploadedPhoto,
  pickBestPhotoUrl,
  clearAvatarFromOutside,
} from "@/shared/contexts/AvatarContext";

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

    const resolvedScanCount =
      typeof userDoc?.scanCount === "number"
        ? userDoc.scanCount
        : typeof userDoc?.personalScanCount === "number"
          ? userDoc.personalScanCount
          : undefined;
    const hasPersonalScanCount = typeof resolvedScanCount === "number";
    const hasCommentCount      = typeof userDoc?.commentCount === "number";

    if (hasPersonalScanCount && hasCommentCount) {
      return {
        scanCount: resolvedScanCount!,
        commentCount: userDoc.commentCount,
        totalLikesReceived: userDoc?.totalLikesReceived || 0,
      };
    }

    const COUNT_LIMIT = 1000;
    const [scansResult, commentsResult] = await Promise.all([
      hasPersonalScanCount ? Promise.resolve(null) : db.query([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS], { limit: COUNT_LIMIT }),
      db.query([COLLECTIONS.USERS, userId, COLLECTIONS.COMMENTS], { limit: COUNT_LIMIT }),
    ]);

    const realComments = (commentsResult?.docs ?? []).filter(
      (d: any) => !d.data?.isDeleted && !String(d.data?.text || "").startsWith("__qr_vote__:")
    );
    const liveLikesReceived = realComments.reduce(
      (sum: number, d: any) => sum + Math.max(0, Number(d.data?.likes ?? d.data?.likeCount ?? 0)),
      0
    );

    return {
      scanCount:            hasPersonalScanCount ? resolvedScanCount! : (scansResult?.docs.length ?? 0),
      commentCount:         Math.max(userDoc?.commentCount ?? 0, realComments.length),
      totalLikesReceived:   Math.max(userDoc?.totalLikesReceived || 0, liveLikesReceived),
    };
  } catch {
    return { scanCount: 0, commentCount: 0, totalLikesReceived: 0 };
  }
}

export async function updateUserPhotoURL(userId: string, photoURL: string | null): Promise<void> {
  try {
    clearUserProfileCache();
    await db.update([COLLECTIONS.USERS, userId], {
      photoURL: photoURL ?? null,
      avatarUrl: photoURL ?? null,
    });
  } catch {}
}

export async function updateUserProfilePhoto(
  userId: string,
  base64Data: string,
  oldPhotoUrl?: string | null
): Promise<string> {
  try {
    const newPhotoUrl = await uploadBase64Image(base64Data, "avatars", userId, true, 400, 0.8);
    if (oldPhotoUrl && storageAdapter.isOwnUrl(oldPhotoUrl)) {
      await deleteImage(oldPhotoUrl).catch(() => {});
    }
    // Also clean up any older files inside {userId}/ in the avatars bucket (matching Web behavior)
    try {
      const newFilename = newPhotoUrl.split("/").pop()?.split("?")[0];
      const { data: existingList } = await supabase.storage
        .from(SUPABASE_BUCKETS.AVATARS)
        .list(userId, { limit: 100 });
      if (Array.isArray(existingList) && existingList.length > 0) {
        const oldFiles = existingList
          .filter((f) => f.name && f.name !== newFilename)
          .map((f) => `${userId}/${f.name}`);
        if (oldFiles.length > 0) {
          await supabase.storage.from(SUPABASE_BUCKETS.AVATARS).remove(oldFiles);
        }
      }
    } catch {}
    clearUserProfileCache();
    await db.update([COLLECTIONS.USERS, userId], {
      photoURL: newPhotoUrl,
      avatarUrl: newPhotoUrl,
    });
    return newPhotoUrl;
  } catch (error: any) {
    console.error("[user-service] updateUserProfilePhoto failed:", error);
    throw error;
  }
}

export async function getUserPhotoURL(userId: string): Promise<string | null> {
  try {
    let data = getCachedUserProfile(userId);
    const cachedBest = pickBestPhotoUrl(
      data?.photoURL,
      data?.avatarUrl,
      data?.photo_url,
      data?.avatar_url
    );
    if (!data || !isUserUploadedPhoto(cachedBest)) {
      const fresh = await db.get([COLLECTIONS.USERS, userId]);
      if (fresh) {
        data = fresh;
        setCachedUserProfile(userId, fresh);
      }
    }
    return pickBestPhotoUrl(
      data?.photoURL,
      data?.avatarUrl,
      data?.photo_url,
      data?.avatar_url
    );
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
  if (!userId) return;
  const now = new Date().toISOString();

  // 1. Delete all user-uploaded avatar files from canonical Supabase Storage bucket (`avatars`)
  // MUST run while the user's Supabase session is still active so Storage RLS succeeds.
  try {
    const { data: existingList } = await supabase.storage
      .from(SUPABASE_BUCKETS.AVATARS)
      .list(userId, { limit: 100 });
    if (Array.isArray(existingList) && existingList.length > 0) {
      const allFiles = existingList
        .filter((item) => item.name)
        .map((item) => `${userId}/${item.name}`);
      if (allFiles.length > 0) {
        await supabase.storage.from(SUPABASE_BUCKETS.AVATARS).remove(allFiles);
      }
    }
  } catch {}

  // 2. Cascade delete / anonymize across canonical Supabase tables (while session JWT is active)
  try {
    await supabase.from(SUPABASE_TABLES.COMMENT_LIKES).delete().eq("user_id", userId);
  } catch {}

  try {
    await supabase.from(SUPABASE_TABLES.QR_REPORTS).delete().eq("user_id", userId);
  } catch {}

  try {
    await supabase.from(SUPABASE_TABLES.QR_SCANS).delete().eq("user_id", userId);
  } catch {}

  try {
    await supabase.from(SUPABASE_TABLES.QR_COMMENTS).delete().eq("user_id", userId);
    await supabase
      .from(SUPABASE_TABLES.QR_COMMENTS)
      .update({
        is_deleted: true,
        text: "[deleted]",
        user_display_name: "Deleted User",
        user_username: null,
        user_photo_url: null,
        updated_at: now,
      })
      .eq("user_id", userId);
  } catch {}

  try {
    await supabase
      .from(SUPABASE_TABLES.QR_CODES)
      .update({
        owner_id: null,
        owner_name: "[deleted]",
        owner_logo_base64: null,
        is_owner_deleted: true,
        updated_at: now,
      })
      .eq("owner_id", userId);
  } catch {}

  try {
    await supabase.from(SUPABASE_TABLES.USERNAMES).delete().eq("user_id", userId);
  } catch {}

  try {
    await supabase
      .from(SUPABASE_TABLES.USERS)
      .update({
        is_deleted: true,
        deleted_at: now,
        email: `deleted_${userId}@deleted.binro.app`,
        display_name: "Deleted User",
        username: null,
        past_usernames: [],
        photo_url: null,
        avatar_url: null,
        scan_count: 0,
        comment_count: 0,
        updated_at: now,
      })
      .eq("id", userId);

    await supabase.from(SUPABASE_TABLES.USERS).delete().eq("id", userId);
  } catch {}

  // 3. Clear local mobile caches (AvatarContext, profile cache, and AsyncStorage)
  try {
    clearUserProfileCache();
    clearAvatarFromOutside();
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.multiRemove([
      "avatar_url_v1",
      "avatar_version_v1",
      "local_scan_history",
      `local_scan_history_${userId}`,
    ]);
  } catch {}
}

export async function submitFeedback(
  userId: string | null,
  email: string | null,
  message: string
): Promise<void> {
  await db.add([COLLECTIONS.FEEDBACK], { userId, email, message, createdAt: db.timestamp() });
}
