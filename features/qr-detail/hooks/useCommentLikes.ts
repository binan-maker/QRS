import { useState, useEffect, useRef } from "react";
import * as Haptics from "@/shared/utils/haptics";
import { toggleCommentLike, getCommentUserLikes } from "@/lib/firestore-service";
import { router } from "expo-router";
import type { CommentItem } from "./comment-types";

interface UseCommentLikesParams {
  id: string;
  userId: string | null;
  commentsList: CommentItem[];
  setCommentsList: React.Dispatch<React.SetStateAction<CommentItem[]>>;
}

export function useCommentLikes({ id, userId, commentsList, setCommentsList }: UseCommentLikesParams) {
  const [userLikes, setUserLikes] = useState<Record<string, "like" | "dislike">>({});

  const committedLikesRef   = useRef<Record<string, "like" | "dislike" | null>>({});
  const pendingFinalLikeRef = useRef<Record<string, "like" | "dislike" | null>>({});
  const likeTimersRef       = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!userId || !commentsList.length) return;
    const ids = commentsList.map((c) => c.id);
    getCommentUserLikes(id, ids, userId).then((likes) => {
      setUserLikes((prev) => ({ ...prev, ...likes }));
      Object.entries(likes).forEach(([cid, val]) => {
        if (!likeTimersRef.current.has(cid)) committedLikesRef.current[cid] = val;
      });
    });
  }, [commentsList, userId, id]);

  function handleCommentLike(commentId: string, action: "like" | "dislike") {
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
        let likes = c.likeCount, dislikes = c.dislikeCount;
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
    pendingFinalLikeRef.current[commentId] = newLike;
    const existingTimer = likeTimersRef.current.get(commentId);
    if (existingTimer) clearTimeout(existingTimer);

    const capturedUserId = userId;
    const timer = setTimeout(async () => {
      likeTimersRef.current.delete(commentId);
      const desired = pendingFinalLikeRef.current[commentId] ?? null;
      delete pendingFinalLikeRef.current[commentId];
      const committed = committedLikesRef.current[commentId] ?? null;
      if (desired === committed) return;
      const isLike = desired !== null ? desired === "like" : committed === "like";
      try {
        const data = await toggleCommentLike(id, commentId, capturedUserId, isLike);
        committedLikesRef.current[commentId] = desired;
        setCommentsList((prev) =>
          prev.map((c) =>
            c.id !== commentId ? c : { ...c, likeCount: data.likes, dislikeCount: data.dislikes }
          )
        );
      } catch {}
    }, 600);

    likeTimersRef.current.set(commentId, timer);
  }

  return { userLikes, handleCommentLike };
}
