import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import {
  addComment,
  reportComment,
  softDeleteComment,
} from "@/lib/firestore-service";
import { queryClient } from "@/shared/services/query-client";
import type { CommentItem } from "./comment-types";

interface UseCommentActionsParams {
  id: string;
  userId: string | null;
  emailVerified: boolean;
  user: any;
  setCommentsList: Dispatch<SetStateAction<CommentItem[]>>;
  pendingCommentsRef: MutableRefObject<CommentItem[]>;
  deletingIdsRef: MutableRefObject<Set<string>>;
  setExpandedReplies: Dispatch<SetStateAction<Record<string, boolean>>>;
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
  // Synchronous guard — prevents a second tap from firing a second submission
  // while the first is still in-flight (the `submitting` state reads as false
  // until the next render cycle, so it cannot guard the entry point reliably).
  const submittingRef   = useRef(false);

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
    // Synchronous guard: reject duplicate taps before the first render cycle
    // has had a chance to set submitting=true in state.
    if (submittingRef.current) return;

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

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const saved = await addComment(id, userId, clientDisplayName, trimmed, parentId, emailVerified, clientUsername, clientPhotoURL);
      // Update the optimistic comment with server-resolved data but KEEP the tempId
      // as the React key. Swapping to saved.id changes the key → React unmounts
      // and remounts the Animated.View with FadeIn → visible flash. On the next
      // natural refresh the real Firestore comment (with saved.id) will take over.
      pendingCommentsRef.current = pendingCommentsRef.current.filter((c) => c.id !== tempId);
      setCommentsList((prev) =>
        prev.map((c) => (c.id === tempId ? { ...saved, id: tempId } : c))
      );
    } catch (e: any) {
      pendingCommentsRef.current = pendingCommentsRef.current.filter((c) => c.id !== tempId);
      setCommentsList((prev) => prev.filter((c) => c.id !== tempId));
      Alert.alert(
        "Cannot Post Comment",
        e?.code === "permission-denied"
          ? "You don't have permission to comment here."
          : e?.message || "Something went wrong. Please try again."
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [id, userId, newComment, replyTo, emailVerified, user, pendingCommentsRef, deletingIdsRef, setCommentsList, setExpandedReplies]);

  const handleCommentReport = useCallback(async (commentId: string, reason: string) => {
    setCommentReportModal(null);
    if (!userId) return;
    try {
      await reportComment(id, commentId, userId, reason, emailVerified);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert(
        "Couldn't Submit Report",
        e?.code === "permission-denied"
          ? "You don't have permission to report this comment."
          : "Failed to send your report. Please try again."
      );
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
    } catch (e: any) {
      // Rollback optimistic removal
      deletingIdsRef.current.delete(commentId);
      if (removedComment) {
        setCommentsList((prev) => {
          const already = prev.find((c) => c.id === commentId);
          if (already) return prev;
          return [removedComment, ...prev];
        });
      }
      Alert.alert(
        "Couldn't Delete",
        e?.code === "permission-denied"
          ? "You don't have permission to delete this comment."
          : "Failed to delete the comment. Please try again."
      );
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
