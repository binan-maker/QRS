import React, { useState, useEffect, useRef } from "react";
import { Alert, TextInput } from "react-native";
import * as Haptics from "@/shared/utils/haptics";
import {
  subscribeToComments, addComment, ownerHideComment, softDeleteComment,
  type CommentItem,
} from "@/lib/firestore-service";
import { useAuth } from "@/shared/contexts/AuthContext";

export function useOwnerComments(qrCodeId: string | null | undefined) {
  const { user } = useAuth();
  const commentInputRef = useRef<TextInput>(null) as React.RefObject<TextInput>;

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!qrCodeId) return;
    setCommentsLoading(true);
    const unsub = subscribeToComments(qrCodeId, 200, (list) => {
      setComments(list);
      setCommentsLoading(false);
    });
    return unsub;
  }, [qrCodeId]);

  const topLevelComments = comments.filter((c) => !c.parentId);

  function getAllDescendants(parentId: string): CommentItem[] {
    const result: CommentItem[] = [];
    const queue = [parentId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const children = comments.filter((c) => c.parentId === curr);
      children.forEach((child) => {
        result.push(child);
        queue.push(child.id);
      });
    }
    return result;
  }

  async function handleSubmitComment() {
    if (!user || !qrCodeId || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const clientUsername: string | undefined = (user as any)?.username || undefined;
      const clientPhotoURL: string | undefined = user?.photoURL || undefined;
      await addComment(
        qrCodeId, user.id, user.displayName,
        commentText.trim(), replyTo?.id || null,
        user.emailVerified ?? false, clientUsername, clientPhotoURL
      );
      setCommentText("");
      setReplyTo(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not post comment.");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleModerateComment(commentId: string, commentUserId: string) {
    if (!user || !qrCodeId) return;
    const isOwn = user.id === commentUserId;
    Alert.alert(
      isOwn ? "Delete comment?" : "Remove comment?",
      isOwn ? "This cannot be undone." : "This will hide the comment from everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isOwn ? "Delete" : "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              if (isOwn) await softDeleteComment(qrCodeId, commentId, user.id);
              else await ownerHideComment(qrCodeId, commentId);
            } catch {
              Alert.alert("Error", "Could not remove comment.");
            }
          },
        },
      ]
    );
  }

  return {
    commentInputRef,
    comments, commentsLoading,
    commentText, setCommentText,
    replyTo, setReplyTo,
    submittingComment, expandedReplies, setExpandedReplies,
    topLevelComments, getAllDescendants,
    handleSubmitComment, handleModerateComment,
  };
}
