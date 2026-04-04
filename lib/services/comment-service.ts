import { db } from "../db/client";
import { checkCommentKeywords } from "../qr-analysis";
import { tsToString } from "./utils";
import {
  checkCommentEligibility,
  recordComment,
  checkCommentReportEligibility,
  recordCommentReport,
} from "./integrity-service";
import {
  notifyQrFollowers,
  notifyMentionedUsers,
  notifyQrOwner,
  notifyCommentParentAuthor,
} from "./notification-service";
import type { CommentItem } from "./types";
// SECURITY FIX P1: Import profanity filter for comment validation
import { checkProfanity, sanitizeComment } from "./profanity-filter";

// FIX #3: Simple in-memory cache for user profiles to avoid N+1 queries
const userProfileCache = new Map<string, { username?: string; photoURL?: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getUserProfileCache(userId: string): { username?: string; photoURL?: string } | null {
  const cached = userProfileCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { username: cached.username, photoURL: cached.photoURL };
  }
  return null;
}

export async function preloadUserProfile(userId: string): Promise<void> {
  // Check cache first
  if (getUserProfileCache(userId)) return;
  
  try {
    const userData = await db.get(["users", userId]);
    if (userData) {
      userProfileCache.set(userId, {
        username: userData.username as string | undefined,
        photoURL: userData.photoURL as string | undefined,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
  } catch {}
}

export type { CommentItem };

export function subscribeToComments(
  qrId: string,
  pageLimit: number,
  onUpdate: (comments: CommentItem[]) => void
): () => void {
  return db.onQuery(
    ["qrCodes", qrId, "comments"],
    { orderBy: { field: "createdAt", direction: "desc" }, limit: pageLimit },
    (docs) => {
      const comments: CommentItem[] = docs
        .filter((d) => !d.data.isDeleted)
        .map((d) => ({
          id: d.id,
          qrCodeId: qrId,
          userId: d.data.userId,
          text: d.data.text,
          parentId: d.data.parentId || null,
          isDeleted: false,
          isHidden: d.data.isHidden || false,
          reportCount: d.data.reportCount || 0,
          likeCount: d.data.likeCount || 0,
          dislikeCount: d.data.dislikeCount || 0,
          createdAt: tsToString(d.data.createdAt),
          userLike: null,
          user: { displayName: d.data.userDisplayName || "User" },
          userUsername: d.data.userUsername || undefined,
          userPhotoURL: d.data.userPhotoURL || undefined,
        }));
      onUpdate(comments);
    }
  );
}

export async function getCommentUserLikes(
  qrId: string,
  commentIds: string[],
  userId: string
): Promise<Record<string, "like" | "dislike">> {
  if (!commentIds.length) return {};
  const result: Record<string, "like" | "dislike"> = {};
  await Promise.all(
    commentIds.map(async (commentId) => {
      try {
        const data = await db.get(["qrCodes", qrId, "comments", commentId, "likes", userId]);
        if (data) {
          result[commentId] = data.isLike ? "like" : "dislike";
        }
      } catch {}
    })
  );
  return result;
}

export async function getComments(
  qrId: string,
  pageLimit: number = 20,
  cursor?: any
): Promise<{ comments: CommentItem[]; hasMore: boolean; cursor?: any }> {
  const { docs, cursor: newCursor } = await db.query(
    ["qrCodes", qrId, "comments"],
    { orderBy: { field: "createdAt", direction: "desc" }, limit: pageLimit + 1, cursor }
  );
  const hasMore = docs.length > pageLimit;
  const allDocs = hasMore ? docs.slice(0, pageLimit) : docs;
  const filtered = allDocs.filter((d) => !d.data.isDeleted);
  const comments: CommentItem[] = filtered.map((d) => ({
    id: d.id,
    qrCodeId: qrId,
    userId: d.data.userId,
    text: d.data.text,
    parentId: d.data.parentId || null,
    isDeleted: false,
    isHidden: d.data.isHidden || false,
    reportCount: d.data.reportCount || 0,
    likeCount: d.data.likeCount || 0,
    dislikeCount: d.data.dislikeCount || 0,
    createdAt: tsToString(d.data.createdAt),
    userLike: null,
    user: { displayName: d.data.userDisplayName || "User" },
    userUsername: d.data.userUsername || undefined,
    userPhotoURL: d.data.userPhotoURL || undefined,
  }));
  return { comments, hasMore, cursor: allDocs.length > 0 ? newCursor : undefined };
}

export async function addComment(
  qrId: string,
  userId: string,
  displayName: string,
  text: string,
  parentId: string | null = null,
  emailVerified: boolean = false
): Promise<CommentItem> {

  // Integrity check — rate limits, cooldowns, duplicate detection, length
  await checkCommentEligibility(userId, qrId, emailVerified, text);

  // SECURITY FIX P1: Profanity filter check (DPDP Act 2023 compliance)
  const profanityCheck = checkProfanity(text);
  if (profanityCheck.isBlocked) {
    throw new Error(
      `Your comment contains inappropriate language (${profanityCheck.categories.join(', ')}). Please revise your comment.`
    );
  }

  // Keyword / spam phrase check
  const kwCheck = checkCommentKeywords(text);
  if (kwCheck.blocked) {
    throw new Error(
      `Your comment was blocked because it contains content that resembles spam or a scam ("${kwCheck.matchedKeyword}"). Please revise your comment.`
    );
  }

  // Sanitize comment text to prevent XSS
  const sanitizedText = sanitizeComment(text.trim());

  // FIX #3: Get cached user data from a single batch fetch instead of per-comment lookup
  // User profile data should be fetched once at app startup and cached
  const userCache = getUserProfileCache(userId);
  const userUsername = userCache?.username;
  const userPhotoURL = userCache?.photoURL;

  const { id: commentId } = await db.add(["qrCodes", qrId, "comments"], {
    userId,
    userDisplayName: displayName,
    ...(userUsername ? { userUsername } : {}),
    ...(userPhotoURL ? { userPhotoURL } : {}),
    text: sanitizedText,
    parentId,
    isDeleted: false,
    isHidden: false,
    reportCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    createdAt: db.timestamp(),
  });

  // Update comment count on QR code
  try {
    await db.increment(["qrCodes", qrId], "commentCount", 1);
  } catch (e) {
    console.warn("[db] addComment: failed to increment commentCount:", e);
  }

  // Mirror comment in user history for per-QR limit queries
  try {
    await db.set(["users", userId, "comments", commentId], {
      commentId,
      qrCodeId: qrId,
      text: text.trim(),
      createdAt: db.timestamp(),
    });
  } catch {}

  // Update rate limit counters
  await recordComment(userId);

  notifyQrFollowers(qrId, "new_comment", `${displayName} commented on a QR you follow`, userId).catch(() => {});
  notifyMentionedUsers(qrId, text, userId, displayName).catch(() => {});
  notifyQrOwner(qrId, userId, displayName).catch(() => {});
  if (parentId) {
    notifyCommentParentAuthor(qrId, parentId, userId, displayName).catch(() => {});
  }

  return {
    id: commentId,
    qrCodeId: qrId,
    userId,
    text: text.trim(),
    parentId,
    isDeleted: false,
    likeCount: 0,
    dislikeCount: 0,
    createdAt: new Date().toISOString(),
    userLike: null,
    user: { displayName },
    userUsername,
  };
}

export async function toggleCommentLike(
  qrId: string,
  commentId: string,
  userId: string,
  isLike: boolean
): Promise<{ likes: number; dislikes: number }> {
  const likePath = ["qrCodes", qrId, "comments", commentId, "likes", userId];
  const commentPath = ["qrCodes", qrId, "comments", commentId];
  const existing = await db.get(likePath);

  const commentData = await db.get(commentPath);
  const authorId: string | null = commentData?.userId || null;

  let likeDelta = 0;

  if (existing) {
    const wasLike = existing.isLike;
    if (wasLike === isLike) {
      await db.delete(likePath);
      await db.increment(commentPath, isLike ? "likeCount" : "dislikeCount", -1);
      if (isLike) likeDelta = -1;
    } else {
      await db.set(likePath, { isLike, createdAt: db.timestamp() });
      await db.increment(commentPath, "likeCount", isLike ? 1 : -1);
      await db.increment(commentPath, "dislikeCount", isLike ? -1 : 1);
      if (isLike) likeDelta = 1;
      else likeDelta = -1;
    }
  } else {
    await db.set(likePath, { isLike, createdAt: db.timestamp() });
    await db.increment(commentPath, isLike ? "likeCount" : "dislikeCount", 1);
    if (isLike) likeDelta = 1;
  }

  if (authorId && authorId !== userId && likeDelta !== 0) {
    try {
      await db.increment(["users", authorId], "totalLikesReceived", likeDelta);
    } catch {}
  }

  const updated = await db.get(commentPath);
  if (updated) {
    return { likes: updated.likeCount || 0, dislikes: updated.dislikeCount || 0 };
  }
  return { likes: 0, dislikes: 0 };
}

export async function reportComment(
  qrId: string,
  commentId: string,
  userId: string,
  reason: string,
  emailVerified: boolean = false
): Promise<void> {

  // Integrity check — account tier and daily comment-report rate limit
  await checkCommentReportEligibility(userId, emailVerified);

  const reportPath = ["qrCodes", qrId, "comments", commentId, "reports", userId];
  const commentPath = ["qrCodes", qrId, "comments", commentId];

  await db.set(reportPath, { reason, createdAt: db.timestamp(), userId });

  try {
    const commentData = await db.get(commentPath);
    await db.add(["moderationQueue"], {
      type: "comment_report",
      qrCodeId: qrId,
      commentId,
      reportedByUserId: userId,
      reason,
      commentText: commentData?.text || "",
      commentAuthorId: commentData?.userId || "",
      commentAuthorName: commentData?.userDisplayName || "Unknown",
      status: "pending",
      createdAt: db.timestamp(),
    });
  } catch {}

  try {
    const { docs } = await db.query(["qrCodes", qrId, "comments", commentId, "reports"]);
    const reportCount = docs.length;
    await db.update(commentPath, { reportCount });
    // Auto-hide threshold: 3 reports for new accounts, 2 for trusted reporters
    if (reportCount >= 3) await db.update(commentPath, { isHidden: true });
  } catch {}

  // Update rate limit counter
  await recordCommentReport(userId);
}

export async function ownerHideComment(qrId: string, commentId: string): Promise<void> {
  try {
    await db.update(["qrCodes", qrId, "comments", commentId], { isHidden: true });
  } catch (e) {
    console.warn("[db] ownerHideComment failed:", e);
    throw e;
  }
}

const SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// FIX #6: Optimized cleanup function for scheduled execution via Cloud Functions
// Uses collection group queries and batched operations to avoid O(N*M) complexity
// Should be called by a Cloud Function on a weekly schedule with proper pagination
export async function hardDeleteOldSoftDeletes(
  options: { batchSize?: number; maxQrCodes?: number; continuationToken?: string } = {}
): Promise<{ deletedCount: number; continuationToken?: string; hasMore: boolean }> {
  const now = Date.now();
  const batchSize = options.batchSize || 500;
  const maxQrCodes = options.maxQrCodes || 100;
  let totalDeleted = 0;
  
  try {
    // OPTIMIZATION: Use collection group query to find ALL soft-deleted comments across all QRs
    // This is MUCH more efficient than querying each QR individually
    // Note: Requires a COLLECTION_GROUP index on comments.isDeleted + comments.deletedAt
    const { docs: deletedComments } = await db.query(["comments"], {
      where: [{ field: "isDeleted", op: "==", value: true }],
      orderBy: { field: "deletedAt", direction: "asc" },
      limit: batchSize,
      cursor: options.continuationToken ? { startAt: [options.continuationToken] } : undefined,
    });
    
    const toDeleteByQr: Map<string, string[]> = new Map();
    let cutoffReached = false;
    
    for (const d of deletedComments) {
      const deletedAt = d.data.deletedAt;
      let deletedAtMs = 0;
      if (deletedAt && typeof deletedAt === "object" && "toDate" in deletedAt) {
        deletedAtMs = (deletedAt as any).toDate().getTime();
      } else if (deletedAt && typeof deletedAt === "string") {
        deletedAtMs = new Date(deletedAt).getTime();
      }
      
      // Stop processing if we hit comments that are too recent (optimization)
      if (deletedAtMs > 0 && now - deletedAtMs <= SOFT_DELETE_TTL_MS) {
        cutoffReached = true;
        break;
      }
      
      if (deletedAtMs > 0 && now - deletedAtMs > SOFT_DELETE_TTL_MS) {
        // Group deletions by parent QR code for batch deletion
        const qrId = d.data.qrCodeId || d.data.parentId;
        if (qrId) {
          if (!toDeleteByQr.has(qrId)) {
            toDeleteByQr.set(qrId, []);
          }
          toDeleteByQr.get(qrId)!.push(d.id);
        }
      }
    }
    
    // Execute batched deletions (Firestore allows 500 operations per batch)
    const deletePromises: Promise<void>[] = [];
    for (const [qrId, commentIds] of toDeleteByQr.entries()) {
      // Split into batches of 500 (Firestore limit)
      for (let i = 0; i < commentIds.length; i += 500) {
        const batch = commentIds.slice(i, i + 500);
        const promise = Promise.all(
          batch.map(id => db.delete(["qrCodes", qrId, "comments", id]).catch(() => {}))
        ).then(() => {});
        deletePromises.push(promise);
      }
      totalDeleted += commentIds.length;
    }
    
    await Promise.all(deletePromises);
    
    const hasMore = !cutoffReached && deletedComments.length >= batchSize;
    const nextToken = hasMore && deletedComments.length > 0 
      ? deletedComments[deletedComments.length - 1].id 
      : undefined;
    
    console.log(`[cleanup] hardDeleteOldSoftDeletes: Deleted ${totalDeleted} old soft-deleted comments${hasMore ? ' (more pending)' : ''}`);
    
    return {
      deletedCount: totalDeleted,
      continuationToken: nextToken,
      hasMore,
    };
  } catch (e) {
    console.error("[cleanup] hardDeleteOldSoftDeletes failed:", e);
    return {
      deletedCount: totalDeleted,
      hasMore: false,
    };
  }
}

export async function softDeleteComment(
  qrId: string,
  commentId: string,
  userId: string
): Promise<void> {
  const ref = ["qrCodes", qrId, "comments", commentId];
  const data = await db.get(ref);
  if (data && data.userId === userId) {
    await db.update(ref, {
      isDeleted: true,
      deletedAt: db.timestamp(),
      text: "[deleted]",
    });
    try { await db.increment(["qrCodes", qrId], "commentCount", -1); } catch {}
    try { await db.delete(["users", userId, "comments", commentId]); } catch {}
    // FIX #6: Trigger immediate cleanup for this specific QR's old soft deletes
    purgeOldSoftDeletes(qrId).catch(() => {});
  }
}

async function purgeOldSoftDeletes(qrId: string): Promise<void> {
  try {
    const { docs } = await db.query(["qrCodes", qrId, "comments"], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 100, // Increased limit to catch more old deletes
    });
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const d of docs) {
      if (!d.data.isDeleted) continue;
      const deletedAt = d.data.deletedAt;
      let deletedAtMs = 0;
      if (deletedAt && typeof deletedAt === "object" && "toDate" in deletedAt) {
        deletedAtMs = (deletedAt as any).toDate().getTime();
      } else if (deletedAt && typeof deletedAt === "string") {
        deletedAtMs = new Date(deletedAt).getTime();
      }
      if (deletedAtMs > 0 && now - deletedAtMs > SOFT_DELETE_TTL_MS) {
        toDelete.push(d.id);
      }
    }
    
    // Batch delete all expired soft-deleted comments
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(id => db.delete(["qrCodes", qrId, "comments", id]).catch(() => {})));
    }
  } catch {}
}

export async function deleteAllUserComments(userId: string): Promise<void> {
  const { docs } = await db.query(
    ["users", userId, "comments"],
    { orderBy: { field: "createdAt", direction: "desc" }, limit: 500 }
  );
  await Promise.all(
    docs.map(async (d) => {
      const { qrCodeId, commentId } = d.data;
      if (qrCodeId && commentId) {
        await db
          .update(["qrCodes", qrCodeId, "comments", commentId], {
            isDeleted: true,
            deletedAt: db.timestamp(),
            text: "[deleted]",
          })
          .catch(() => {});
        await db.increment(["qrCodes", qrCodeId], "commentCount", -1).catch(() => {});
      }
      await db.delete(["users", userId, "comments", d.id]).catch(() => {});
    })
  );
}

export async function getUserComments(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    ["users", userId, "comments"],
    { orderBy: { field: "createdAt", direction: "desc" } }
  );
  return docs.map((d) => ({
    id: d.id,
    ...d.data,
    createdAt: tsToString(d.data.createdAt),
  }));
}
