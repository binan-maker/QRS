import { db } from "@/lib/db/client";
import { tsToString } from "../utils";
import type { CommentItem } from "../types";
import { enrichCommentsWithProfiles } from "./cache";
import { COLLECTIONS } from "@/shared/constants/collections";

export type { CommentItem };

function docToComment(d: { id: string; data: any }, qrId: string): CommentItem {
  return {
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
        .filter((d) => !d.data.isDeleted)
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
        const data = await db.get([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId, COLLECTIONS.LIKES, userId]);
        if (data) result[commentId] = data.isLike ? "like" : "dislike";
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
  const filtered = allDocs.filter((d) => !d.data.isDeleted);
  const rawComments: CommentItem[] = filtered.map((d) => docToComment(d, qrId));
  const comments = await enrichCommentsWithProfiles(rawComments);
  return { comments, hasMore, cursor: allDocs.length > 0 ? newCursor : undefined };
}

// Reads the user's comment index (IDs only), then fetches each comment's
// full data from the source-of-truth path: qrCodes/{qrId}/comments/{commentId}.
// The user sub-collection is a lightweight lookup table — no text is stored there.
// FIX: Added `limit` param (default 50) to prevent unbounded N+1 reads for
// power users with hundreds of comments. The index query is capped; the parallel
// Promise.all fetch for comment bodies is already batched — not sequential.
export async function getUserComments(userId: string, limit = 50): Promise<any[]> {
  const { docs: indexDocs } = await db.query(
    [COLLECTIONS.USERS, userId, COLLECTIONS.COMMENTS],
    { orderBy: { field: "createdAt", direction: "desc" }, limit }
  );

  const results = await Promise.all(
    indexDocs.map(async (d) => {
      const { qrCodeId, commentId } = d.data;
      if (!qrCodeId || !commentId) return null;
      try {
        const commentData = await db.get([COLLECTIONS.QR_CODES, qrCodeId, COLLECTIONS.COMMENTS, commentId]);
        if (!commentData || commentData.isDeleted) return null;
        return {
          id: commentId,
          qrCodeId,
          ...commentData,
          createdAt: tsToString(commentData.createdAt),
        };
      } catch {
        return null;
      }
    })
  );

  return results.filter(Boolean);
}
