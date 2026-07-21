import { useEffect, useState, useCallback, useRef, useMemo, useLayoutEffect } from "react";
import { useAuth } from "@/shared/contexts/AuthContext";
import { getComments } from "@/lib/firestore-service";
import * as Haptics from "@/shared/utils/haptics";
import { type CommentItem, COMMENTS_PER_PAGE, REPLIES_PER_PAGE } from "./comment-types";
import { mergeWithOptimistic, getAllDescendants, getRootCommentId } from "./comment-list-utils";
import { useCommentLikes } from "./useCommentLikes";
import { useCommentActions } from "./useCommentActions";

export type { CommentItem };

export function useQrComments(id: string, userId: string | null, offlineMode: boolean) {
  const { user } = useAuth();
  const emailVerified = user?.emailVerified ?? false;

  const [commentsList, setCommentsList]             = useState<CommentItem[]>([]);
  const [hasMoreComments, setHasMoreComments]       = useState(false);
  const [commentsLoading, setCommentsLoading]       = useState(false);
  const [commentsRefreshing, setCommentsRefreshing] = useState(false);
  const [expandedReplies, setExpandedReplies]       = useState<Record<string, boolean>>({});
  const [visibleRepliesCount, setVisibleRepliesCount] = useState<Record<string, number>>({});
  const [revealedComments, setRevealedComments]     = useState<Set<string>>(new Set());

  const lastCommentRef       = useRef<any>(undefined);
  const pendingCommentsRef   = useRef<CommentItem[]>([]);
  const deletingIdsRef       = useRef<Set<string>>(new Set());
  // Mirrors commentsList in a ref so stable callbacks can read the latest value
  // without being recreated on every comment update.
  const commentsListRef      = useRef<CommentItem[]>([]);

  // Keep the ref in sync on every render (before any layout effects run).
  useLayoutEffect(() => { commentsListRef.current = commentsList; });

  const topLevelComments = useMemo(
    () => commentsList.filter((c) => !c.parentId),
    [commentsList]
  );

  const { userLikes, handleCommentLike } = useCommentLikes({
    id, userId, commentsList, setCommentsList,
  });

  const actions = useCommentActions({
    id, userId, emailVerified, user,
    setCommentsList, pendingCommentsRef, deletingIdsRef, setExpandedReplies,
  });

  const userUsername   = (user as any)?.username;
  const userPhotoURL   = user?.photoURL;
  const userDisplayName = user?.displayName;
  useEffect(() => {
    if (!userId) return;
    setCommentsList((prev) =>
      prev.map((c) => {
        if (c.userId !== userId) return c;
        return {
          ...c,
          userUsername:   userUsername   || c.userUsername,
          userPhotoURL:   userPhotoURL   || c.userPhotoURL,
          user: { displayName: userDisplayName || c.user.displayName },
        };
      })
    );
  }, [userUsername, userPhotoURL, userDisplayName, userId]);

  const loadInitialComments = useCallback(async (resetOptimistic = false) => {
    if (offlineMode) return;
    if (resetOptimistic) {
      pendingCommentsRef.current = [];
      deletingIdsRef.current     = new Set();
    }
    const pageLimit = userId ? COMMENTS_PER_PAGE : 6;
    setCommentsLoading(true);
    try {
      const result = await getComments(id, pageLimit, undefined);
      if (result.cursor) lastCommentRef.current = result.cursor;
      setHasMoreComments(result.hasMore);
      setCommentsList(mergeWithOptimistic(result.comments as unknown as CommentItem[], pendingCommentsRef, deletingIdsRef));
    } catch {}
    setCommentsLoading(false);
  }, [id, userId, offlineMode]);

  const refreshComments = useCallback(async () => {
    if (offlineMode) return;
    setCommentsRefreshing(true);
    const pageLimit = userId ? COMMENTS_PER_PAGE : 6;
    try {
      const result = await getComments(id, pageLimit, undefined);
      if (result.cursor) lastCommentRef.current = result.cursor;
      setHasMoreComments(result.hasMore);
      setCommentsList(mergeWithOptimistic(result.comments as unknown as CommentItem[], pendingCommentsRef, deletingIdsRef));
    } catch {}
    setCommentsRefreshing(false);
  }, [id, userId, offlineMode]);

  useEffect(() => { loadInitialComments(true); }, [loadInitialComments]);

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
    if (!visibleRepliesCount[commentId]) {
      setVisibleRepliesCount((prev) => ({ ...prev, [commentId]: REPLIES_PER_PAGE }));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [visibleRepliesCount]);

  const showMoreReplies = useCallback((commentId: string) => {
    setVisibleRepliesCount((prev) => ({
      ...prev,
      [commentId]: (prev[commentId] || REPLIES_PER_PAGE) + REPLIES_PER_PAGE,
    }));
  }, []);

  // Reads commentsList via ref so this callback stays stable even as comments
  // are added, liked, or paginated — no unnecessary re-renders in consumers.
  const handleDeleteComment = useCallback(
    (commentId: string) => actions.handleDeleteComment(commentId, commentsListRef.current),
    [actions.handleDeleteComment]
  );

  // Stable callbacks — read via ref so they don't change on every comment update.
  const getAllDescendantsCb = useCallback(
    (rootId: string) => getAllDescendants(commentsListRef.current, rootId),
    []
  );
  const getRootCommentIdCb = useCallback(
    (commentId: string) => getRootCommentId(commentsListRef.current, commentId),
    []
  );

  return {
    ...actions,
    commentsList, topLevelComments,
    userLikes, hasMoreComments,
    commentsLoading, commentsRefreshing, refreshComments,
    expandedReplies, visibleRepliesCount,
    revealedComments, setRevealedComments,
    getAllDescendants: getAllDescendantsCb,
    getRootCommentId: getRootCommentIdCb,
    toggleReplies, showMoreReplies,
    loadMoreComments,
    handleCommentLike,
    handleDeleteComment,
  };
}
