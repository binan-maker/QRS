import { useEffect, useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToComments,
  getComments,
  addComment,
  toggleCommentLike,
  reportComment,
  softDeleteComment,
  getCommentUserLikes,
} from "@/lib/firestore-service";

export interface CommentItem {
  id: string;
  text: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  userLike: "like" | "dislike" | null;
  user: { displayName: string };
  parentId?: string | null;
  userId?: string;
  isDeleted?: boolean;
  isHidden?: boolean;
  reportCount?: number;
  userUsername?: string;
  userPhotoURL?: string;
}

const COMMENTS_PER_PAGE = 20;
const REPLIES_PER_PAGE = 10;

export function useQrComments(id: string, userId: string | null, offlineMode: boolean) {
  const { user } = useAuth();
  const emailVerified = user?.emailVerified ?? false;
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [userLikes, setUserLikes] = useState<Record<string, "like" | "dislike">>({});
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; rootId: string; isNested: boolean } | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [commentMenuOwner, setCommentMenuOwner] = useState(false);
  const [commentReportModal, setCommentReportModal] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [visibleRepliesCount, setVisibleRepliesCount] = useState<Record<string, number>>({});
  const [revealedComments, setRevealedComments] = useState<Set<string>>(new Set());

  const lastCommentRef = useRef<any>(undefined);
  const commentInputRef = useRef<any>(null);
  const scrollRef = useRef<any>(null);

  // Optimistic state: comments added locally but not yet confirmed by Firestore
  const pendingCommentsRef = useRef<CommentItem[]>([]);
  // IDs of comments being deleted — subscription results are filtered to hide them
  const deletingIdsRef = useRef<Set<string>>(new Set());

  const topLevelComments = commentsList.filter((c) => !c.parentId);

  function getAllDescendants(rootId: string): CommentItem[] {
    const result: CommentItem[] = [];
    const queue = [rootId];
    while (queue.length > 0) {
      const pid = queue.shift()!;
      const children = commentsList.filter((c) => c.parentId === pid);
      result.push(...children);
      queue.push(...children.map((c) => c.id));
    }
    return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  function getRootCommentId(commentId: string): string {
    const comment = commentsList.find((c) => c.id === commentId);
    if (!comment || !comment.parentId) return commentId;
    return getRootCommentId(comment.parentId);
  }

  function toggleReplies(commentId: string) {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
    if (!visibleRepliesCount[commentId]) {
      setVisibleRepliesCount((prev) => ({ ...prev, [commentId]: REPLIES_PER_PAGE }));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function showMoreReplies(commentId: string) {
    setVisibleRepliesCount((prev) => ({
      ...prev,
      [commentId]: (prev[commentId] || REPLIES_PER_PAGE) + REPLIES_PER_PAGE,
    }));
  }

  // Merge live subscription results with optimistic state
  function mergeWithOptimistic(liveComments: CommentItem[]): CommentItem[] {
    // Filter out any IDs being deleted
    const filteredLive = liveComments.filter((c) => !deletingIdsRef.current.has(c.id));

    // Drop pending comments that Firestore has now confirmed (matched by userId + text + parentId)
    const confirmedPending = pendingCommentsRef.current.filter((pending) =>
      !filteredLive.some(
        (live) =>
          live.userId === pending.userId &&
          live.text === pending.text &&
          (live.parentId ?? null) === (pending.parentId ?? null)
      )
    );
    pendingCommentsRef.current = confirmedPending;

    // Pending comments appear first (they're the newest)
    return [...confirmedPending, ...filteredLive];
  }

  useEffect(() => {
    if (!userId || !commentsList.length) return;
    const ids = commentsList.map((c) => c.id);
    getCommentUserLikes(id, ids, userId).then((likes) => {
      setUserLikes((prev) => ({ ...prev, ...likes }));
    });
  }, [commentsList, userId, id]);

  useEffect(() => {
    if (replyTo) {
      const t = setTimeout(() => commentInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [replyTo]);

  useEffect(() => {
    if (offlineMode) return;
    // Reset optimistic state when QR changes
    pendingCommentsRef.current = [];
    deletingIdsRef.current = new Set();

    const pageLimit = userId ? COMMENTS_PER_PAGE : 6;
    const unsub = subscribeToComments(id, pageLimit, (liveComments) => {
      setCommentsList(mergeWithOptimistic(liveComments));
    });
    return unsub;
  }, [id, userId, offlineMode]);

  const loadMoreComments = useCallback(async () => {
    if (commentsLoading || !hasMoreComments) return;
    setCommentsLoading(true);
    try {
      const result = await getComments(id, COMMENTS_PER_PAGE, lastCommentRef.current);
      setCommentsList((prev) => [...prev, ...result.comments]);
      if (result.cursor) lastCommentRef.current = result.cursor;
      setHasMoreComments(result.hasMore);
    } catch {}
    setCommentsLoading(false);
  }, [id, commentsLoading, hasMoreComments]);

  async function handleSubmitComment(displayName: string) {
    if (!userId) { router.push("/(auth)/login"); return; }
    const trimmed = newComment.trim();
    if (!trimmed) return;

    // Optimistic insert — show the comment immediately
    const tempId = `pending_${Date.now()}`;
    const parentId = replyTo ? replyTo.rootId : null;
    const optimisticComment: CommentItem = {
      id: tempId,
      text: trimmed,
      userId,
      user: { displayName: user?.displayName || displayName },
      userUsername: user?.displayName || undefined,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      dislikeCount: 0,
      userLike: null,
      parentId,
      isDeleted: false,
      isHidden: false,
      reportCount: 0,
    };
    pendingCommentsRef.current = [optimisticComment, ...pendingCommentsRef.current];
    setCommentsList((prev) => [optimisticComment, ...prev]);

    // Clear input and reply state immediately
    setNewComment("");
    setReplyTo(null);
    if (parentId) {
      setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);

    try {
      await addComment(id, userId, displayName, trimmed, parentId, emailVerified);
      // Subscription will fire and confirm the real comment — pending gets cleared then
    } catch (e: any) {
      // Remove the optimistic comment on failure
      pendingCommentsRef.current = pendingCommentsRef.current.filter((c) => c.id !== tempId);
      setCommentsList((prev) => prev.filter((c) => c.id !== tempId));
      Alert.alert("Cannot Post Comment", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCommentLike(commentId: string, action: "like" | "dislike") {
    if (!userId) { router.push("/(auth)/login"); return; }
    const prevLike = userLikes[commentId] ?? null;
    const newLike: "like" | "dislike" | null = prevLike === action ? null : action;
    setUserLikes((prev) => {
      const next = { ...prev };
      if (newLike === null) delete next[commentId];
      else next[commentId] = newLike;
      return next;
    });
    setCommentsList((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        let likes = c.likeCount;
        let dislikes = c.dislikeCount;
        if (action === "like") {
          likes = newLike === "like" ? likes + 1 : likes - 1;
          if (prevLike === "dislike") dislikes = Math.max(0, dislikes - 1);
        } else {
          dislikes = newLike === "dislike" ? dislikes + 1 : dislikes - 1;
          if (prevLike === "like") likes = Math.max(0, likes - 1);
        }
        return { ...c, likeCount: likes, dislikeCount: dislikes };
      })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const data = await toggleCommentLike(id, commentId, userId, action === "like");
      setCommentsList((prev) =>
        prev.map((c) => c.id !== commentId ? c : { ...c, likeCount: data.likes, dislikeCount: data.dislikes })
      );
    } catch {}
  }

  async function handleCommentReport(commentId: string, reason: string) {
    setCommentReportModal(null);
    if (!userId) return;
    try {
      await reportComment(id, commentId, userId, reason, emailVerified);
      Alert.alert("Reported", "Thank you. We'll review this comment.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Cannot Report", e.message);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!userId) return;
    setCommentMenuId(null);

    // Optimistic removal — mark ID as deleting so subscription doesn't restore it
    deletingIdsRef.current.add(commentId);
    const removedComment = commentsList.find((c) => c.id === commentId);
    setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
    setDeletingCommentId(commentId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await softDeleteComment(id, commentId, userId);
      // Keep in deletingIds — subscription will fire without this doc (isDeleted filtered)
      // and we can safely remove from set at that point, but it's harmless to keep it.
    } catch {
      // Rollback: remove from deleting set and restore comment
      deletingIdsRef.current.delete(commentId);
      if (removedComment) {
        setCommentsList((prev) => {
          const already = prev.find((c) => c.id === commentId);
          if (already) return prev;
          return [removedComment, ...prev];
        });
      }
    } finally {
      setDeletingCommentId(null);
    }
  }

  return {
    commentsList,
    topLevelComments,
    userLikes,
    hasMoreComments,
    newComment, setNewComment,
    replyTo, setReplyTo,
    commentsLoading,
    submitting,
    commentMenuId, setCommentMenuId,
    commentMenuOwner, setCommentMenuOwner,
    commentReportModal, setCommentReportModal,
    deletingCommentId,
    expandedReplies,
    visibleRepliesCount,
    revealedComments, setRevealedComments,
    commentInputRef,
    scrollRef,
    getAllDescendants,
    getRootCommentId,
    toggleReplies,
    showMoreReplies,
    loadMoreComments,
    handleSubmitComment,
    handleCommentLike,
    handleCommentReport,
    handleDeleteComment,
  };
}
