import { useState, useEffect, useCallback, useRef } from "react";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import {
  addComment,
  reportComment,
  softDeleteComment,
} from "@/lib/firestore-service";
import { queryClient } from "@/shared/utils/query-client";
import type { CommentItem } from "./comment-types";

interface UseCommentActionsParams {
  id: string;
  userId: string | null;
  emailVerified: boolean;
  user: any;
  setCommentsList: React.Dispatch<React.SetStateAction<CommentItem[]>>;
  pendingCommentsRef: React.MutableRefObject<CommentItem[]>;
  deletingIdsRef: React.MutableRefObject<Set<string>>;
  setExpandedReplies: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function useCommentActions({
  id, userId, emailVerified, user,
  setCommentsList, pendingCommentsRef, deletingIdsRef, setExpandedReplies,
}: UseCommentActionsParams) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; rootId: string; isNested: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [commentMenuOwner, setCommentMenuOwner] = useState(false);
  const [commentReportModal, setCommentReportModal] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const commentInputRef = useRef<any>(null);
  const scrollRef       = useRef<any>(null);

  useEffect(() => {
    if (replyTo) {
      const t = setTimeout(() => commentInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [replyTo]);

  const handleSubmitComment = useCallback(async () => {
    if (!userId) { router.push("/(auth)/login"); return; }
    const trimmed = newComment.trim();
    if (!trimmed) return;

    // user.username can be undefined briefly after a Firebase token refresh
    // (AuthContext calls setUser without username, and the prefetchQuery may
    // skip its queryFn while the cache is still fresh).  Fall back to the
    // TanStack Query profile cache so the optimistic comment always shows the
    // real username from the very first render.
    const cachedProfile = userId
      ? queryClient.getQueryData<any>(["userProfile", userId])
      : undefined;
    const clientUsername: string | undefined =
      (user as any)?.username || (cachedProfile?.username as string) || undefined;
    const clientPhotoURL: string | undefined =
      user?.photoURL || (cachedProfile?.photoURL as string) || undefined;
    const clientDisplayName: string = user?.displayName || "User";
    const tempId = `pending_${Date.now()}`;
    const parentId = replyTo ? replyTo.rootId : null;

    const optimisticComment: CommentItem = {
      id: tempId, text: trimmed, userId,
      user: { displayName: clientDisplayName },
      userUsername: clientUsername, userPhotoURL: clientPhotoURL,
      createdAt: new Date().toISOString(),
      likeCount: 0, dislikeCount: 0, userLike: null,
      parentId, isDeleted: false, isHidden: false, reportCount: 0,
    };

    pendingCommentsRef.current = [optimisticComment, ...pendingCommentsRef.current];
    setCommentsList((prev) => [optimisticComment, ...prev]);
    setNewComment("");
    setReplyTo(null);
    if (parentId) setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setSubmitting(true);
    try {
      const saved = await addComment(id, userId, clientDisplayName, trimmed, parentId, emailVerified, clientUsername, clientPhotoURL);
      // Replace optimistic comment with the server-resolved one (has the correct userUsername from Firestore)
      pendingCommentsRef.current = pendingCommentsRef.current.filter((c) => c.id !== tempId);
      setCommentsList((prev) =>
        prev.map((c) => (c.id === tempId ? { ...saved, id: saved.id } : c))
      );
    } catch (e: any) {
      pendingCommentsRef.current = pendingCommentsRef.current.filter((c) => c.id !== tempId);
      setCommentsList((prev) => prev.filter((c) => c.id !== tempId));
      Alert.alert("Cannot Post Comment", e.message);
    } finally {
      setSubmitting(false);
    }
  }, [id, userId, newComment, replyTo, emailVerified, user, pendingCommentsRef, deletingIdsRef, setCommentsList, setExpandedReplies]);

  const handleCommentReport = useCallback(async (commentId: string, reason: string) => {
    setCommentReportModal(null);
    if (!userId) return;
    try {
      await reportComment(id, commentId, userId, reason, emailVerified);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
    }
  }, [id, userId, emailVerified]);

  const handleDeleteComment = useCallback(async (commentId: string, commentsList: CommentItem[]) => {
    if (!userId) return;
    setCommentMenuId(null);
    deletingIdsRef.current.add(commentId);
    const removedComment = commentsList.find((c) => c.id === commentId);
    setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
    setDeletingCommentId(commentId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await softDeleteComment(id, commentId, userId);
    } catch {
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
  }, [id, userId, deletingIdsRef, setCommentsList]);

  return {
    newComment, setNewComment,
    replyTo, setReplyTo,
    submitting,
    commentMenuId, setCommentMenuId,
    commentMenuOwner, setCommentMenuOwner,
    commentReportModal, setCommentReportModal,
    deletingCommentId,
    commentInputRef, scrollRef,
    handleSubmitComment,
    handleCommentReport,
    handleDeleteComment,
  };
}
