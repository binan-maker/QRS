import { db } from "../db";
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

  // Keyword / spam phrase check
  const kwCheck = checkCommentKeywords(text);
  if (kwCheck.blocked) {
    throw new Error(
      `Your comment was blocked because it contains content that resembles spam or a scam ("${kwCheck.matchedKeyword}"). Please revise your comment.`
    );
  }

  let userUsername: string | undefined;
  let userPhotoURL: string | undefined;
  try {
    const userData = await db.get(["users", userId]);
    if (userData) {
      if (userData.username) userUsername = userData.username as string;
      if (userData.photoURL) userPhotoURL = userData.photoURL as string;
    }
  } catch {}

  const { id: commentId } = await db.add(["qrCodes", qrId, "comments"], {
    userId,
    userDisplayName: displayName,
    ...(userUsername ? { userUsername } : {}),
    ...(userPhotoURL ? { userPhotoURL } : {}),
    text: text.trim(),
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
  if (existing) {
    const wasLike = existing.isLike;
    if (wasLike === isLike) {
      await db.delete(likePath);
      await db.increment(commentPath, isLike ? "likeCount" : "dislikeCount", -1);
    } else {
      await db.set(likePath, { isLike, createdAt: db.timestamp() });
      await db.increment(commentPath, "likeCount", isLike ? 1 : -1);
      await db.increment(commentPath, "dislikeCount", isLike ? -1 : 1);
    }
  } else {
    await db.set(likePath, { isLike, createdAt: db.timestamp() });
    await db.increment(commentPath, isLike ? "likeCount" : "dislikeCount", 1);
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
    purgeOldSoftDeletes(qrId).catch(() => {});
  }
}

async function purgeOldSoftDeletes(qrId: string): Promise<void> {
  try {
    const { docs } = await db.query(["qrCodes", qrId, "comments"], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 50,
    });
    const now = Date.now();
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
        db.delete(["qrCodes", qrId, "comments", d.id]).catch(() => {});
      }
    }
  } catch {}
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
