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

  // ── Synchronous ref — always reflects the latest like state, never stale.
  // React state updates are batched/async; reading `userLikes[id]` inside a
  // rapid tap handler gives the value from the *previous* render, causing the
  // toggle to flip in the wrong direction and produce negative counts.
  const currentLikeRef     = useRef<Record<string, "like" | "dislike" | null>>({});
  const committedLikesRef   = useRef<Record<string, "like" | "dislike" | null>>({});
  const pendingFinalLikeRef = useRef<Record<string, "like" | "dislike" | null>>({});
  const likeTimersRef       = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!userId || !commentsList.length) return;
    const ids = commentsList.map((c) => c.id);
    getCommentUserLikes(id, ids, userId).then((likes) => {
      setUserLikes((prev) => {
        const next = { ...prev };
        Object.entries(likes).forEach(([cid, val]) => {
          if (!likeTimersRef.current.has(cid)) {
            if (val === null || val === undefined) {
              delete next[cid];
            } else {
              next[cid] = val;
            }
          }
        });
        return next;
      });
      Object.entries(likes).forEach(([cid, val]) => {
        if (!likeTimersRef.current.has(cid)) {
          committedLikesRef.current[cid] = val;
          // Sync currentLikeRef with confirmed server state
          currentLikeRef.current[cid] = val;
        }
      });
    });
  }, [commentsList, userId, id]);

  function handleCommentLike(commentId: string, action: "like" | "dislike") {
    if (!userId) { router.push("/(auth)/login"); return; }

    // ── Read from the synchronous ref, not the async state, to avoid stale
    //    closures when the user taps multiple times before a re-render.
    const prevLike = currentLikeRef.current[commentId] ?? null;
    const newLike: "like" | "dislike" | null = prevLike === action ? null : action;

    // Update the ref immediately so the next tap sees the correct prev value.
    currentLikeRef.current[commentId] = newLike;

    // Update the display state for the icon/colour.
    setUserLikes((prev) => {
      const next = { ...prev };
      if (newLike === null) delete next[commentId];
      else next[commentId] = newLike;
      return next;
    });

    // ── Optimistic count update ────────────────────────────────────────────
    // Uses functional form so it always reads the latest commentsList, not a
    // captured closure snapshot.
    setCommentsList((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        let likes = c.likeCount, dislikes = c.dislikeCount;
        if (action === "like") {
          likes    = newLike === "like" ? likes + 1 : Math.max(0, likes - 1);
          if (prevLike === "dislike") dislikes = Math.max(0, dislikes - 1);
        } else {
          dislikes = newLike === "dislike" ? dislikes + 1 : Math.max(0, dislikes - 1);
          if (prevLike === "like") likes = Math.max(0, likes - 1);
        }
        return { ...c, likeCount: likes, dislikeCount: dislikes };
      })
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pendingFinalLikeRef.current[commentId] = newLike;

    // Debounce: cancel any in-flight timer for this comment so only the final
    // intent is sent to Firestore.
    const existingTimer = likeTimersRef.current.get(commentId);
    if (existingTimer) clearTimeout(existingTimer);

    const capturedUserId = userId;
    const timer = setTimeout(async () => {
      likeTimersRef.current.delete(commentId);
      const desired  = pendingFinalLikeRef.current[commentId] ?? null;
      delete pendingFinalLikeRef.current[commentId];
      const committed = committedLikesRef.current[commentId] ?? null;
      if (desired === committed) return;
      const isLike = desired !== null ? desired === "like" : committed === "like";
      try {
        const data = await toggleCommentLike(id, commentId, capturedUserId, isLike);
        committedLikesRef.current[commentId] = desired;
        // Sync currentLikeRef with confirmed server state (if no newer tap occurred)
        if (currentLikeRef.current[commentId] === desired) {
          // already in sync — no change needed
        }
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
