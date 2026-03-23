import { useEffect, useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
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
    const pageLimit = userId ? COMMENTS_PER_PAGE : 6;
    const unsub = subscribeToComments(id, pageLimit, (liveComments) => {
      setCommentsList(liveComments);
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
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const parentId = replyTo ? replyTo.rootId : null;
      await addComment(id, userId, displayName, newComment.trim(), parentId, emailVerified);
      if (parentId) {
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      }
      setNewComment("");
      setReplyTo(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error("[Comment] Error submitting comment:", e?.message, e);
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
    const removedComment = commentsList.find((c) => c.id === commentId);
    setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
    setDeletingCommentId(commentId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await softDeleteComment(id, commentId, userId);
    } catch {
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
