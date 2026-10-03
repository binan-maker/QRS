import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/lib/db/client";
import { tsToString } from "../utils";
import type { CommentItem } from "../types";
import { enrichCommentsWithProfiles } from "./cache";
import {
  getCachedCommentDislikes,
  setCachedCommentDislikes,
  getCachedUserReaction,
  setCachedUserReaction,
} from "./write";
import { COLLECTIONS } from "@/shared/constants/collections";

export type { CommentItem };

function docToComment(d: { id: string; data: any }, qrId: string): CommentItem {
  const rawName: string | undefined = d.data.userName || d.data.userDisplayName || undefined;
  const derivedUsername: string | undefined =
    d.data.userUsername || (rawName ? String(rawName).replace(/^@/, "") : undefined);
  return {
    id: d.id,
    qrCodeId: d.data.qrCodeId || qrId,
    userId: d.data.userId,
    text: d.data.text,
    parentId: d.data.parentId || null,
    isDeleted: Boolean(d.data.isDeleted),
    reportCount: Number(d.data.reportCount ?? 0),
    likeCount: Number(d.data.likes ?? d.data.likeCount ?? 0),
    dislikeCount: getCachedCommentDislikes(d.id) || Number(d.data.dislikeCount ?? 0),
    createdAt: tsToString(d.data.createdAt),
    userLike: null,
    user: { displayName: rawName || "User" },
    userUsername: derivedUsername,
    userPhotoURL: (d.data.userPhotoURL || d.data.photoURL || d.data.avatar) || undefined,
  };
}

export function subscribeToComments(
  qrId: string,
  pageLimit: number,
  onUpdate: (comments: CommentItem[]) => void
): () => void {
  return db.onQuery(
    [COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS],
    { orderBy: { field: "createdAt", direction: "desc" }, limit: pageLimit },
    (docs) => {
      const comments: CommentItem[] = docs
        .filter((d) => !d.data.isDeleted && !String(d.data.text || "").startsWith("__qr_vote__:"))
        .map((d) => docToComment(d, qrId));

      onUpdate(comments);
      enrichCommentsWithProfiles(comments).then((enriched) => {
        const hasChanges = enriched.some(
          (e, i) => e.userUsername !== comments[i]?.userUsername || e.userPhotoURL !== comments[i]?.userPhotoURL
        );
        if (hasChanges) onUpdate(enriched);
      }).catch(() => {});
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
        const cached = getCachedUserReaction(commentId, userId);
        if (cached === "like" || cached === "dislike") {
          result[commentId] = cached;
          return;
        }
        const storedReaction = await AsyncStorage.getItem(`comment_reaction_${commentId}_${userId}`);
        if (storedReaction === "like" || storedReaction === "dislike") {
          setCachedUserReaction(commentId, userId, storedReaction);
          result[commentId] = storedReaction;
          return;
        }
        const data = await db.get([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId, COLLECTIONS.LIKES, userId]);
        if (data) {
          // comment_likes rows in Postgres only represent likes (no is_like column)
          const reaction = data.isLike === false ? "dislike" : "like";
          setCachedUserReaction(commentId, userId, reaction);
          result[commentId] = reaction;
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
    [COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS],
    { orderBy: { field: "createdAt", direction: "desc" }, limit: pageLimit + 1, cursor }
  );
  const hasMore = docs.length > pageLimit;
  const allDocs = hasMore ? docs.slice(0, pageLimit) : docs;
  const filtered = allDocs.filter(
    (d) => !d.data.isDeleted && !String(d.data.text || "").startsWith("__qr_vote__:")
  );

  await Promise.all(
    filtered.map(async (d) => {
      if (getCachedCommentDislikes(d.id) === 0) {
        try {
          const raw = await AsyncStorage.getItem(`comment_dislikes_${d.id}`);
          if (raw && Number(raw) > 0) {
            setCachedCommentDislikes(d.id, Number(raw));
          }
        } catch {}
      }
    })
  );

  const rawComments: CommentItem[] = filtered.map((d) => docToComment(d, qrId));
  const comments = await enrichCommentsWithProfiles(rawComments);
  return { comments, hasMore, cursor: allDocs.length > 0 ? newCursor : undefined };
}

export async function getUserComments(userId: string, limit = 50): Promise<any[]> {
  const { docs: indexDocs } = await db.query(
    [COLLECTIONS.USERS, userId, COLLECTIONS.COMMENTS],
    { orderBy: { field: "createdAt", direction: "desc" }, limit }
  );

  const results = await Promise.all(
    indexDocs.map(async (d) => {
      const qrCodeId = d.data.qrCodeId;
      const commentId = d.data.commentId || d.id;
      if (!qrCodeId || !commentId) return null;

      // In Postgres, querying users/{userId}/comments queries qr_comments directly
      if (typeof d.data.text === "string") {
        if (d.data.isDeleted) return null;
        return {
          id: commentId,
          qrCodeId,
          ...d.data,
          likeCount: Number(d.data.likes ?? d.data.likeCount ?? 0),
          createdAt: tsToString(d.data.createdAt),
        };
      }

      try {
        const commentData = await db.get([COLLECTIONS.QR_CODES, qrCodeId, COLLECTIONS.COMMENTS, commentId]);
        if (!commentData || commentData.isDeleted) return null;
        return {
          id: commentId,
          qrCodeId,
          ...commentData,
          likeCount: Number(commentData.likes ?? commentData.likeCount ?? 0),
          createdAt: tsToString(commentData.createdAt),
        };
      } catch {
        return null;
      }
    })
  );

  return results.filter(Boolean);
}
