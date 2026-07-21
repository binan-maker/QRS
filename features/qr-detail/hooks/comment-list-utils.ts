import type { MutableRefObject } from "react";
import type { CommentItem } from "./comment-types";

export function mergeWithOptimistic(
  liveComments: CommentItem[],
  pendingRef: MutableRefObject<CommentItem[]>,
  deletingRef: MutableRefObject<Set<string>>
): CommentItem[] {
  const filteredLive = liveComments.filter((c) => !deletingRef.current.has(c.id));
  const confirmedPending = pendingRef.current.filter((pending) =>
    !filteredLive.some(
      (live) =>
        live.userId === pending.userId &&
        live.text === pending.text &&
        (live.parentId ?? null) === (pending.parentId ?? null)
    )
  );
  pendingRef.current = confirmedPending;
  return [...confirmedPending, ...filteredLive];
}

export function getAllDescendants(commentsList: CommentItem[], rootId: string): CommentItem[] {
  const result: CommentItem[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const pid = queue.shift()!;
    const children = commentsList.filter((c) => c.parentId === pid);
    result.push(...children);
    queue.push(...children.map((c) => c.id));
  }
  return result.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function getRootCommentId(commentsList: CommentItem[], commentId: string): string {
  const comment = commentsList.find((c) => c.id === commentId);
  if (!comment || !comment.parentId) return commentId;
  return getRootCommentId(commentsList, comment.parentId);
}
