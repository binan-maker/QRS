import { db } from "@/lib/db/client";
import { checkCommentKeywords } from "@/services/analysis";
import { checkCommentEligibility, recordComment } from "../integrity-service";
import { notifyQrFollowers, notifyMentionedUsers, notifyQrOwner, notifyCommentParentAuthor } from "../notification-service";
import type { CommentItem } from "../types";
import { checkProfanity, sanitizeComment } from "../profanity-filter";
import { getUserProfileCache, preloadUserProfile, setUserProfileCache } from "./cache";
import { authAdapter } from "@/lib/auth";

// Firestore client-side rules lock commentCount from direct client writes.
// This helper calls the Express backend (which uses Admin SDK, bypassing rules)
// to apply the delta. Fails silently — the comment document itself is the
// source of truth; the count is a cached aggregate.
async function adjustCommentCount(qrId: string, delta: 1 | -1): Promise<void> {
  const raw = process.env.EXPO_PUBLIC_DOMAIN;
  const host = raw ? raw.split(":")[0] : null;
  const serverUrl = host ? `https://${host}` : (
    typeof __DEV__ !== "undefined" && __DEV__ ? "http://localhost:5000" : ""
  );
  if (!serverUrl) return;

  const currentUser = authAdapter.getCurrentUser();
  if (!currentUser) return;

  try {
    const token = await currentUser.getIdToken();
    await fetch(`${serverUrl}/api/v1/qr/${qrId}/comment-count`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ delta }),
    });
  } catch {
    // Non-fatal — count will re-sync on next data fetch
  }
}

export async function addComment(
  qrId: string,
  userId: string,
  displayName: string,
  text: string,
  parentId: string | null = null,
  emailVerified: boolean = false,
  clientUsername?: string,
  clientPhotoURL?: string,
): Promise<CommentItem> {
  await checkCommentEligibility(userId, qrId, emailVerified, text);

  const profanityCheck = checkProfanity(text);
  if (profanityCheck.isBlocked) {
    throw new Error(
      `Your comment contains inappropriate language (${profanityCheck.categories.join(', ')}). Please revise your comment.`
    );
  }

  const kwCheck = checkCommentKeywords(text);
  if (kwCheck.blocked) {
    throw new Error(
      `Your comment was blocked because it contains content that resembles spam or a scam ("${kwCheck.matchedKeyword}"). Please revise your comment.`
    );
  }

  const sanitizedText = sanitizeComment(text.trim());

  let resolvedUsername: string | undefined = clientUsername;
  let resolvedPhotoURL: string | undefined = clientPhotoURL;

  if (!resolvedUsername || !resolvedPhotoURL) {
    let userCache = getUserProfileCache(userId);
    if (!userCache) {
      await preloadUserProfile(userId);
      userCache = getUserProfileCache(userId);
    }
    if (!resolvedUsername) resolvedUsername = userCache?.username;
    if (!resolvedPhotoURL) resolvedPhotoURL = userCache?.photoURL;
  }

  if (!resolvedUsername) {
    try {
      const userData = await db.get(["users", userId]);
      if (userData?.username) resolvedUsername = userData.username as string;
      if (!resolvedPhotoURL && userData?.photoURL) resolvedPhotoURL = userData.photoURL as string;
      setUserProfileCache(userId, resolvedUsername, resolvedPhotoURL);
    } catch {}
  }

  const { id: commentId } = await db.add(["qrCodes", qrId, "comments"], {
    userId,
    userDisplayName: displayName,
    ...(resolvedUsername ? { userUsername: resolvedUsername } : {}),
    ...(resolvedPhotoURL ? { userPhotoURL: resolvedPhotoURL } : {}),
    text: sanitizedText,
    parentId,
    isDeleted: false,
    isHidden: false,
    reportCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    createdAt: db.timestamp(),
  });

  // Write user index entry (source of truth is qrCodes/{qrId}/comments).
  // commentCount is routed through the server because Firestore client rules
  // lock that field against direct client writes — see adjustCommentCount above.
  await db.set(["users", userId, "comments", commentId], {
    commentId,
    qrCodeId: qrId,
    createdAt: db.timestamp(),
  }).catch((e) => {
    console.warn("[db] addComment: failed to write user index:", e);
  });
  adjustCommentCount(qrId, 1).catch(() => {});

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
    userUsername: resolvedUsername,
    userPhotoURL: resolvedPhotoURL,
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

  // Parallelise the two independent reads to reduce round-trip latency.
  const [existing, commentData] = await Promise.all([
    db.get(likePath),
    db.get(commentPath),
  ]);

  const authorId: string | null = commentData?.userId || null;

  // Baseline counts from the pre-read snapshot. We compute the final values
  // arithmetically instead of doing a post-write Firestore read, which can
  // return a stale cached value (likeCount: 0) before the server-side
  // FieldValue.increment result propagates — causing the optimistic count to
  // visually snap back to 0 ~2 s after the tap.
  let finalLikes    = commentData?.likeCount    ?? 0;
  let finalDislikes = commentData?.dislikeCount ?? 0;
  let likeDelta     = 0;

  if (existing) {
    const wasLike = existing.isLike;
    if (wasLike === isLike) {
      // Same button tapped again → toggle OFF
      const batch = db.batch();
      batch.delete(likePath);
      batch.increment(commentPath, isLike ? "likeCount" : "dislikeCount", -1);
      await batch.commit();
      if (isLike) {
        likeDelta = -1;
        finalLikes = Math.max(0, finalLikes - 1);
      } else {
        finalDislikes = Math.max(0, finalDislikes - 1);
      }
    } else {
      // Switched from like→dislike or dislike→like
      const batch = db.batch();
      batch.set(likePath, { isLike, createdAt: db.timestamp() });
      batch.increment(commentPath, "likeCount",    isLike ? 1 : -1);
      batch.increment(commentPath, "dislikeCount", isLike ? -1 : 1);
      await batch.commit();
      likeDelta     = isLike ? 1 : -1;
      finalLikes    = Math.max(0, finalLikes    + (isLike ?  1 : -1));
      finalDislikes = Math.max(0, finalDislikes + (isLike ? -1 :  1));
    }
  } else {
    // First interaction on this comment
    const batch = db.batch();
    batch.set(likePath, { isLike, createdAt: db.timestamp() });
    batch.increment(commentPath, isLike ? "likeCount" : "dislikeCount", 1);
    await batch.commit();
    if (isLike) {
      likeDelta = 1;
      finalLikes += 1;
    } else {
      finalDislikes += 1;
    }
  }

  if (authorId && authorId !== userId && likeDelta !== 0) {
    try { await db.increment(["users", authorId], "totalLikesReceived", likeDelta); } catch {}
  }

  // Return the arithmetically-computed counts — no post-write read needed.
  return { likes: finalLikes, dislikes: finalDislikes };
}

export async function softDeleteComment(qrId: string, commentId: string, userId: string): Promise<void> {
  const ref = ["qrCodes", qrId, "comments", commentId];
  const data = await db.get(ref);
  if (data && data.userId === userId) {
    // Mark deleted and remove user index entry. commentCount is decremented via
    // the server endpoint because Firestore client rules lock that field.
    const batch = db.batch();
    batch.update(ref, { isDeleted: true, deletedAt: db.timestamp(), text: "[deleted]" });
    batch.delete(["users", userId, "comments", commentId]);
    try {
      await batch.commit();
    } catch (e) {
      console.warn("[db] softDeleteComment: batch failed, falling back:", e);
      await db.update(ref, { isDeleted: true, deletedAt: db.timestamp(), text: "[deleted]" }).catch(() => {});
      await db.delete(["users", userId, "comments", commentId]).catch(() => {});
    }
    adjustCommentCount(qrId, -1).catch(() => {});
    purgeOldSoftDeletes(qrId).catch(() => {});
  }
}

const SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function purgeOldSoftDeletes(qrId: string): Promise<void> {
  try {
    const { docs } = await db.query(["qrCodes", qrId, "comments"], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 100,
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
      if (deletedAtMs > 0 && now - deletedAtMs > SOFT_DELETE_TTL_MS) toDelete.push(d.id);
    }
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
        const batch = db.batch();
        batch.update(["qrCodes", qrCodeId, "comments", commentId], {
          isDeleted: true, deletedAt: db.timestamp(), text: "[deleted]",
        });
        batch.delete(["users", userId, "comments", d.id]);
        await batch.commit().catch(() => {});
        adjustCommentCount(qrCodeId, -1).catch(() => {});
      } else {
        await db.delete(["users", userId, "comments", d.id]).catch(() => {});
      }
    })
  );
}