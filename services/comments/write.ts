import { universalAsyncStorage as AsyncStorage } from "@shared/utils/universal-storage";
import { db } from "@/lib/db/client";
import { supabase } from "@/lib/supabase";
import { tsToMs } from "../integrity/time-utils";
import { checkCommentEligibility, recordComment } from "../integrity";
import type { CommentItem } from "../types";
import { checkProfanity, sanitizeComment } from "../moderation/profanity-filter";
import { getUserProfileCache, preloadUserProfile, setUserProfileCache } from "./cache";
import { getAnonymousQrContent } from "../cache/anonymous-session";
import { detectContentType } from "../qr-content-type";
import { authAdapter } from "@/lib/auth";
import { COLLECTIONS } from "@/shared/constants/collections";
import { API_BASE_URL } from "@/config";

// In-memory reaction & dislike tracking (since comment_likes only stores likes and qr_comments only has `likes`)
const memoryCommentReactions = new Map<string, "like" | "dislike" | null>();
const memoryCommentDislikes = new Map<string, number>();

export function getCachedCommentDislikes(commentId: string): number {
  return memoryCommentDislikes.get(commentId) ?? 0;
}

export function setCachedCommentDislikes(commentId: string, count: number): void {
  memoryCommentDislikes.set(commentId, Math.max(0, count));
}

export function getCachedUserReaction(commentId: string, userId: string): "like" | "dislike" | null | undefined {
  return memoryCommentReactions.get(`${commentId}:${userId}`);
}

export function setCachedUserReaction(commentId: string, userId: string, reaction: "like" | "dislike" | null): void {
  memoryCommentReactions.set(`${commentId}:${userId}`, reaction);
}

async function ensureCommentParentRecords(
  qrId: string,
  userId: string,
  displayName: string,
  emailVerified: boolean,
  username?: string,
  photoURL?: string
): Promise<void> {
  await Promise.allSettled([
    (async () => {
      const existingQr = await db.get([COLLECTIONS.QR_CODES, qrId]);
      if (existingQr) return;

      let content = "";
      let contentType = "";
      const inMem = getAnonymousQrContent(qrId);
      if (inMem?.content) {
        content = inMem.content;
        contentType = inMem.contentType || "";
      }
      if (!content) {
        try {
          const raw = await AsyncStorage.getItem(`qr_content_${qrId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.content) {
              content = parsed.content;
              contentType = parsed.contentType || "";
            }
          }
        } catch {}
      }
      const finalContent = content || qrId;
      const finalContentType = contentType || detectContentType(finalContent);
      const now = db.timestamp();
      await db.set([COLLECTIONS.QR_CODES, qrId], {
        content: finalContent,
        contentType: finalContentType,
        qrType: "qr",
        scanCount: 1,
        commentCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    })(),
    (async () => {
      const existingUser = await db.get([COLLECTIONS.USERS, userId]);
      if (existingUser) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;
      const email = authUser?.email || `${userId}@users.binro.app`;
      const meta = authUser?.user_metadata ?? {};
      const resolvedDisplayName =
        displayName ||
        meta.full_name ||
        meta.name ||
        meta.display_name ||
        email.split("@")[0] ||
        "User";
      const now = db.timestamp();
      await db.set([COLLECTIONS.USERS, userId], {
        email,
        emailVerified: Boolean(emailVerified || authUser?.email_confirmed_at),
        displayName: resolvedDisplayName,
        ...(username ? { username } : {}),
        photoURL: photoURL ?? meta.custom_avatar_url ?? meta.photo_url ?? meta.avatar_url ?? meta.picture ?? null,
        isDeleted: false,
        createdAt: authUser?.created_at || now,
        updatedAt: now,
      });
    })(),
  ]);
}

async function adjustCommentCount(qrId: string, userId: string, delta: 1 | -1): Promise<void> {
  // Update Postgres counters directly via RPC / read-update fallback
  db.increment([COLLECTIONS.QR_CODES, qrId], "commentCount", delta).catch(() => {});
  if (userId) {
    db.increment([COLLECTIONS.USERS, userId], "commentCount", delta).catch(() => {});
  }

  const serverUrl = API_BASE_URL;
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
      `Your comment contains inappropriate language (${profanityCheck.categories.join(", ")}). Please revise your comment.`
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
      const userData = await db.get([COLLECTIONS.USERS, userId]);
      if (userData?.username) resolvedUsername = userData.username as string;
      if (!resolvedPhotoURL && userData?.photoURL) resolvedPhotoURL = userData.photoURL as string;
      setUserProfileCache(userId, resolvedUsername, resolvedPhotoURL);
    } catch {}
  } else {
    setUserProfileCache(userId, resolvedUsername, resolvedPhotoURL);
  }

  // Ensure parent qr_codes and users rows exist before inserting into qr_comments
  await ensureCommentParentRecords(
    qrId,
    userId,
    displayName,
    emailVerified,
    resolvedUsername,
    resolvedPhotoURL
  );

  const now = db.timestamp();
  const userNameForDb = resolvedUsername || displayName || "User";

  // Match exact columns of public.qr_comments in packages/db/src/schema.ts
  const { id: commentId } = await db.add([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS], {
    userId,
    userName: userNameForDb,
    parentId: parentId ?? null,
    text: sanitizedText,
    likes: 0,
    reportCount: 0,
    isDeleted: false,
    isPinned: false,
    isEdited: false,
    createdAt: now,
    updatedAt: now,
  });

  adjustCommentCount(qrId, userId, 1).catch(() => {});
  await recordComment(userId);

  // Quality-checked community contribution (15+ chars, profanity-checked)
  import("../rewards/reward-service")
    .then(({ processCommunityContributionReward }) =>
      processCommunityContributionReward({
        userId,
        qrId,
        contributionType: "helpful_comment",
        commentText: sanitizedText,
      })
    )
    .catch(() => {});

  return {
    id: commentId,
    qrCodeId: qrId,
    userId,
    text: sanitizedText,
    parentId,
    isDeleted: false,
    likeCount: 0,
    dislikeCount: 0,
    createdAt: now,
    userLike: null,
    user: { displayName: displayName || userNameForDb },
    userUsername: resolvedUsername || userNameForDb.replace(/^@/, ""),
    userPhotoURL: resolvedPhotoURL,
  };
}

export async function toggleCommentLike(
  qrId: string,
  commentId: string,
  userId: string,
  isLike: boolean
): Promise<{ likes: number; dislikes: number }> {
  const likePath = [COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId, COLLECTIONS.LIKES, userId];
  const commentPath = [COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId];

  const [existingLikeRow, commentData, storedReactionRaw, storedDislikesRaw] = await Promise.all([
    db.get(likePath).catch(() => null),
    db.get(commentPath).catch(() => null),
    AsyncStorage.getItem(`comment_reaction_${commentId}_${userId}`).catch(() => null),
    AsyncStorage.getItem(`comment_dislikes_${commentId}`).catch(() => null),
  ]);

  const authorId: string | null = commentData?.userId || null;

  let prevReaction: "like" | "dislike" | null = getCachedUserReaction(commentId, userId) ?? null;
  if (prevReaction === null) {
    if (storedReactionRaw === "like" || storedReactionRaw === "dislike") {
      prevReaction = storedReactionRaw;
    } else if (existingLikeRow) {
      prevReaction = "like";
    }
  }

  let finalLikes = Number(commentData?.likes ?? commentData?.likeCount ?? 0);
  let finalDislikes =
    memoryCommentDislikes.get(commentId) ??
    (storedDislikesRaw ? Number(storedDislikesRaw) || 0 : Number(commentData?.dislikeCount ?? 0));
  let likeDelta = 0;

  const targetReaction: "like" | "dislike" = isLike ? "like" : "dislike";
  let nextReaction: "like" | "dislike" | null;

  if (prevReaction === targetReaction) {
    // Same button tapped again -> toggle OFF
    nextReaction = null;
    if (isLike) {
      await db.delete(likePath).catch(() => {});
      await db.increment(commentPath, "likes", -1).catch(() => {});
      likeDelta = -1;
      finalLikes = Math.max(0, finalLikes - 1);
    } else {
      finalDislikes = Math.max(0, finalDislikes - 1);
    }
  } else if (prevReaction !== null) {
    // Switched from like -> dislike or dislike -> like
    nextReaction = targetReaction;
    if (isLike) {
      await db.set(likePath, { createdAt: db.timestamp() }).catch(() => {});
      await db.increment(commentPath, "likes", 1).catch(() => {});
      likeDelta = 1;
      finalLikes = Math.max(0, finalLikes + 1);
      finalDislikes = Math.max(0, finalDislikes - 1);
    } else {
      await db.delete(likePath).catch(() => {});
      await db.increment(commentPath, "likes", -1).catch(() => {});
      likeDelta = -1;
      finalLikes = Math.max(0, finalLikes - 1);
      finalDislikes = Math.max(0, finalDislikes + 1);
    }
  } else {
    // First interaction on this comment
    nextReaction = targetReaction;
    if (isLike) {
      await db.set(likePath, { createdAt: db.timestamp() }).catch(() => {});
      await db.increment(commentPath, "likes", 1).catch(() => {});
      likeDelta = 1;
      finalLikes += 1;
    } else {
      finalDislikes += 1;
    }
  }

  setCachedUserReaction(commentId, userId, nextReaction);
  setCachedCommentDislikes(commentId, finalDislikes);

  await Promise.allSettled([
    nextReaction
      ? AsyncStorage.setItem(`comment_reaction_${commentId}_${userId}`, nextReaction)
      : AsyncStorage.removeItem(`comment_reaction_${commentId}_${userId}`),
    AsyncStorage.setItem(`comment_dislikes_${commentId}`, String(finalDislikes)),
    supabase.from("rtdb_store").upsert(
      {
        path: `comment_reaction:${commentId}:${userId}`,
        value: { commentId, userId, reaction: nextReaction, updatedAt: db.timestamp() },
        updated_at: db.timestamp(),
      },
      { onConflict: "path" }
    ),
  ]);

  if (authorId && authorId !== userId && likeDelta !== 0) {
    try {
      await db.increment([COLLECTIONS.USERS, authorId], "totalLikesReceived", likeDelta);
    } catch {}
  }

  return { likes: finalLikes, dislikes: finalDislikes };
}

export async function softDeleteComment(qrId: string, commentId: string, userId: string): Promise<void> {
  const ref = [COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId];
  const data = await db.get(ref);
  if (data && data.userId === userId) {
    const now = db.timestamp();
    const { data: updatedRows, error: updateErr } = await supabase
      .from("qr_comments")
      .update({ is_deleted: true, updated_at: now, text: "[deleted]" })
      .eq("id", commentId)
      .eq("user_id", userId)
      .select("id");

    // If RLS blocks UPDATE on qr_comments (0 rows updated), fall back to DELETE
    if (updateErr || !updatedRows || updatedRows.length === 0) {
      await supabase
        .from("qr_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", userId);
    }

    adjustCommentCount(qrId, userId, -1).catch(() => {});
    purgeOldSoftDeletes(qrId).catch(() => {});
  }
}

export async function updateComment(
  qrId: string,
  commentId: string,
  userId: string,
  text: string,
): Promise<void> {
  const sanitizedText = sanitizeComment(text.trim());
  if (!sanitizedText) throw new Error("Comment cannot be empty.");

  const profanityCheck = checkProfanity(sanitizedText);
  if (profanityCheck.isBlocked) {
    throw new Error(
      `Your comment contains inappropriate language (${profanityCheck.categories.join(", ")}). Please revise it.`
    );
  }

  const ref = [COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId];
  const data = await db.get(ref);
  if (!data || data.userId !== userId || data.isDeleted) {
    throw new Error("You can only edit your own active comments.");
  }

  await db.update(ref, {
    text: sanitizedText,
    updatedAt: db.timestamp(),
    isEdited: true,
  });
}

const SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function purgeOldSoftDeletes(qrId: string): Promise<void> {
  try {
    const { docs } = await db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 100,
    });
    const now = Date.now();
    const toDelete: string[] = [];
    for (const d of docs) {
      if (!d.data.isDeleted) continue;
      const deletedAt = d.data.updatedAt || d.data.createdAt;
      const deletedAtMs = tsToMs(deletedAt);
      if (deletedAtMs > 0 && now - deletedAtMs > SOFT_DELETE_TTL_MS) toDelete.push(d.id);
    }
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(id => db.delete([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, id]).catch(() => {})));
    }
  } catch {}
}

export async function deleteAllUserComments(userId: string): Promise<void> {
  const { docs } = await db.query(
    [COLLECTIONS.USERS, userId, COLLECTIONS.COMMENTS],
    { orderBy: { field: "createdAt", direction: "desc" }, limit: 500 }
  );
  await Promise.all(
    docs.map(async (d) => {
      const qrCodeId = d.data.qrCodeId;
      const commentId = d.data.commentId || d.id;
      if (qrCodeId && commentId) {
        const now = db.timestamp();
        const { data: updatedRows, error } = await supabase
          .from("qr_comments")
          .update({ is_deleted: true, updated_at: now, text: "[deleted]" })
          .eq("id", commentId)
          .eq("user_id", userId)
          .select("id");
        if (error || !updatedRows || updatedRows.length === 0) {
          await supabase.from("qr_comments").delete().eq("id", commentId).eq("user_id", userId);
        }
        adjustCommentCount(qrCodeId, userId, -1).catch(() => {});
      }
    })
  );
}