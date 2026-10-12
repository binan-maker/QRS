import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import { addComment, softDeleteComment } from "@/lib/data-service";
import { queryClient } from "@/lib/query-client";
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
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const commentInputRef = useRef<any>(null);
  const scrollRef = useRef<any>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (replyTo) {
      const t = setTimeout(() => commentInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [replyTo]);

  const handleSubmitComment = useCallback(async () => {
    if (!userId) { router.push("/(auth)/login"); return; }
    const trimmed = newComment.trim();
    if (!trimmed || submittingRef.current) return;

    const cached = userId ? queryClient.getQueryData<any>(["userProfile", userId]) : undefined;
    const clientUsername = (user as any)?.username || cached?.username;
    const clientPhotoURL = user?.photoURL || cached?.photoURL;
    const clientDisplayName = user?.displayName || "User";
    const tempId = `pending_${Date.now()}`;
    const parentId = replyTo ? replyTo.rootId : null;

    const optimisticComment: CommentItem = {
      id: tempId, text: trimmed, userId, user: { displayName: clientDisplayName },
      userUsername: clientUsername, userPhotoURL: clientPhotoURL,
      createdAt: new Date().toISOString(), likeCount: 0, dislikeCount: 0,
      userLike: null, parentId, isDeleted: false, reportCount: 0,
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
      const savedComment = { ...optimisticComment, id: saved.id, text: saved.text ?? trimmed, createdAt: saved.createdAt ?? optimisticComment.createdAt };
      pendingCommentsRef.current = pendingCommentsRef.current.filter((c) => c.id !== tempId);
      setCommentsList((prev) => prev.map((c) => (c.id === tempId ? savedComment : c)));
    } catch (e: any) {
      pendingCommentsRef.current = pendingCommentsRef.current.filter((c) => c.id !== tempId);
      setCommentsList((prev) => prev.filter((c) => c.id !== tempId));
      Alert.alert("Cannot Post Comment", e?.code === "permission-denied" ? "You don't have permission to comment here." : e?.message || "Something went wrong.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [id, userId, newComment, replyTo, emailVerified, user, pendingCommentsRef, setCommentsList, setExpandedReplies]);

  const handleDeleteComment = useCallback(async (commentId: string, commentsList: CommentItem[]) => {
    if (!userId) return;
    setCommentMenuId(null);
    deletingIdsRef.current.add(commentId);
    const removed = commentsList.find((c) => c.id === commentId);
    setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
    setDeletingCommentId(commentId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await softDeleteComment(id, commentId, userId);
    } catch (e: any) {
      deletingIdsRef.current.delete(commentId);
      if (removed) setCommentsList((prev) => (prev.some((c) => c.id === commentId) ? prev : [removed, ...prev]));
      Alert.alert("Couldn't Delete", e?.code === "permission-denied" ? "Permission denied." : "Failed to delete comment.");
    } finally {
      setDeletingCommentId(null);
    }
  }, [id, userId, deletingIdsRef, setCommentsList]);

  return {
    newComment, setNewComment, replyTo, setReplyTo, submitting,
    commentMenuId, setCommentMenuId, commentMenuOwner, setCommentMenuOwner,
    deletingCommentId, commentInputRef, scrollRef, handleSubmitComment, handleDeleteComment,
  };
}
