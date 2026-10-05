import type { MutableRefObject } from "react";
import type { CommentItem } from "@/features/qr-detail/types";
import {
  getAllDescendants as sharedGetAllDescendants,
  getRootCommentId as sharedGetRootCommentId,
  mergeWithOptimisticComments,
} from "@/shared/utils/qr-detail-rules";

export function mergeWithOptimistic(
  liveComments: CommentItem[],
  pendingRef: MutableRefObject<CommentItem[]>,
  deletingRef: MutableRefObject<Set<string>>
): CommentItem[] {
  const merged = mergeWithOptimisticComments(
    liveComments,
    pendingRef.current,
    deletingRef.current
  );
  // Keep pendingRef in sync
  pendingRef.current = pendingRef.current.filter((pending) =>
    !liveComments.some(
      (live) =>
        live.userId === pending.userId &&
        live.text === pending.text &&
        (live.parentId ?? null) === (pending.parentId ?? null)
    )
  );
  return merged;
}

export function getAllDescendants(commentsList: CommentItem[], rootId: string): CommentItem[] {
  return sharedGetAllDescendants(commentsList, rootId);
}

export function getRootCommentId(commentsList: CommentItem[], commentId: string): string {
  return sharedGetRootCommentId(commentsList, commentId);
}
