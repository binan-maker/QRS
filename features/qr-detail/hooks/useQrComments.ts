import { useEffect, useState, useCallback, useRef, useMemo, useLayoutEffect } from "react";
import { useAuth } from "@/shared/contexts/AuthContext";
import { getComments } from "@/lib/data-service";
import * as Haptics from "@/shared/utils/haptics";
import type { CommentItem } from "@/features/qr-detail/types";
import { COMMENTS_PER_PAGE, REPLIES_PER_PAGE } from "@/features/qr-detail/constants";
import { mergeWithOptimistic, getAllDescendants, getRootCommentId } from "@/features/qr-detail/utils/comment-list";
import { useCommentLikes } from "./useCommentLikes";
import { useCommentActions } from "./useCommentActions";

export type { CommentItem } from "@/features/qr-detail/types";

export function useQrComments(id: string, userId: string | null, offlineMode: boolean) {
  const { user } = useAuth();
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(!offlineMode);
  const [commentsRefreshing, setCommentsRefreshing] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [visibleRepliesCount, setVisibleRepliesCount] = useState<Record<string, number>>({});
  const [revealedComments, setRevealedComments] = useState<Set<string>>(new Set());

  const lastCommentRef = useRef<any>(undefined);
  const pendingCommentsRef = useRef<CommentItem[]>([]);
  const deletingIdsRef = useRef<Set<string>>(new Set());
  const commentsListRef = useRef<CommentItem[]>([]);
  commentsListRef.current = commentsList;
  useLayoutEffect(() => { commentsListRef.current = commentsList; });

  const topLevelComments = useMemo(() => {
    const seen = new Set<string>();
    return commentsList.filter((c) => {
      if (!c || !c.id || c.parentId) return false;
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [commentsList]);
  const { userLikes, handleCommentLike } = useCommentLikes({ id, userId, commentsList, setCommentsList });
  const actions = useCommentActions({
    id, userId, emailVerified: user?.emailVerified ?? false, user,
    setCommentsList, pendingCommentsRef, deletingIdsRef, setExpandedReplies,
  });

  const uName = (user as any)?.username, uPhoto = user?.photoURL, uDisplay = user?.displayName;
  useEffect(() => {
    if (!userId) return;
    setCommentsList((prev) => prev.map((c) => (c.userId !== userId ? c : {
      ...c, userUsername: uName || c.userUsername, userPhotoURL: uPhoto || c.userPhotoURL,
      user: { displayName: uDisplay || c.user.displayName },
    })));
  }, [uName, uPhoto, uDisplay, userId]);

  const fetchComments = useCallback(async (isRefresh = false) => {
    if (offlineMode) return;
    if (!isRefresh) { pendingCommentsRef.current = []; deletingIdsRef.current = new Set(); setCommentsLoading(true); }
    else setCommentsRefreshing(true);
    try {
      const result = await getComments(id, userId ? COMMENTS_PER_PAGE : 6, undefined);
      if (result.cursor) lastCommentRef.current = result.cursor;
      setHasMoreComments(result.hasMore);
      setCommentsList(mergeWithOptimistic(result.comments as unknown as CommentItem[], pendingCommentsRef, deletingIdsRef));
    } catch {}
    if (!isRefresh) setCommentsLoading(false); else setCommentsRefreshing(false);
  }, [id, userId, offlineMode]);

  useEffect(() => { fetchComments(false); }, [fetchComments]);

  const loadMoreComments = useCallback(async () => {
    if (commentsLoading || !hasMoreComments) return;
    setCommentsLoading(true);
    try {
      const result = await getComments(id, COMMENTS_PER_PAGE, lastCommentRef.current);
      setCommentsList((prev) => [...prev, ...(result.comments as unknown as CommentItem[])]);
      if (result.cursor) lastCommentRef.current = result.cursor;
      setHasMoreComments(result.hasMore);
    } catch {}
    setCommentsLoading(false);
  }, [id, commentsLoading, hasMoreComments]);

  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
    if (!visibleRepliesCount[commentId]) setVisibleRepliesCount((prev) => ({ ...prev, [commentId]: REPLIES_PER_PAGE }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [visibleRepliesCount]);

  const showMoreReplies = useCallback((commentId: string) => {
    setVisibleRepliesCount((prev) => ({ ...prev, [commentId]: (prev[commentId] || REPLIES_PER_PAGE) + REPLIES_PER_PAGE }));
  }, []);

  return {
    ...actions,
    commentsList, topLevelComments, userLikes, hasMoreComments, commentsLoading, commentsRefreshing,
    refreshComments: () => fetchComments(true),
    expandedReplies, visibleRepliesCount, revealedComments, setRevealedComments,
    getAllDescendants: useCallback((rootId: string) => getAllDescendants(commentsListRef.current || [], rootId), []),
    getRootCommentId: useCallback((commentId: string) => getRootCommentId(commentsListRef.current || [], commentId), []),
    toggleReplies, showMoreReplies, loadMoreComments, handleCommentLike,
    handleDeleteComment: useCallback((cid: string) => actions.handleDeleteComment(cid, commentsListRef.current), [actions.handleDeleteComment]),
  };
}
