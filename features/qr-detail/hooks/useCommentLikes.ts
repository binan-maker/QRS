import { useState, useEffect, useRef, useMemo } from "react";
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

  // ── Synchronous refs — always hold the latest state without stale closures ─
  const currentLikeRef      = useRef<Record<string, "like" | "dislike" | null>>({});
  const committedLikesRef   = useRef<Record<string, "like" | "dislike" | null>>({});
  const pendingFinalLikeRef = useRef<Record<string, "like" | "dislike" | null>>({});

  // Tracks the latest interaction "generation" per comment.
  // Incremented on every tap; the debounce closure captures its value so it
  // can detect whether a newer tap happened before the server call finished.
  const likeGenerationRef = useRef<Record<string, number>>({});

  // Holds the active debounce timer *and* acts as a guard for the useEffect:
  // while a commentId key is present, the effect will not overwrite userLikes
  // for that comment (prevents a mid-flight Firestore read from clobbering the
  // optimistic UI). The key is deleted only AFTER the server call resolves so
  // the guard stays active during the entire round-trip.
  const likeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Stable comment-ID string — only changes when comments are added/removed ─
  const commentIdsKey = useMemo(
    () => commentsList.map((c) => c.id).join(","),
    [commentsList]
  );

  useEffect(() => {
    if (!userId || !commentsList.length) return;
    const ids = commentsList.map((c) => c.id);
    getCommentUserLikes(id, ids, userId).then((likes) => {
      setUserLikes((prev) => {
        const next = { ...prev };
        Object.entries(likes).forEach(([cid, val]) => {
          // Skip if a timer / server round-trip is still active.
          if (likeTimersRef.current.has(cid)) return;

          const firestoreVal = val ?? null;
          const optimisticVal = currentLikeRef.current[cid] ?? null;

          // The user has already interacted and we have a more recent optimistic
          // value — do NOT overwrite with the (potentially stale) Firestore result.
          if (optimisticVal !== firestoreVal) return;

          if (val === null || val === undefined) {
            delete next[cid];
          } else {
            next[cid] = val;
          }
        });
        return next;
      });

      Object.entries(likes).forEach(([cid, val]) => {
        if (likeTimersRef.current.has(cid)) return;
        committedLikesRef.current[cid] = val;
        // Only sync currentLikeRef when it already agrees with Firestore
        // (i.e. no post-timer optimistic change is pending).
        if ((currentLikeRef.current[cid] ?? null) === (val ?? null)) {
          currentLikeRef.current[cid] = val;
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentIdsKey, userId, id]);

  function handleCommentLike(commentId: string, action: "like" | "dislike") {
    if (!userId) { router.push("/(auth)/login"); return; }

    // Bump generation so in-flight server calls can detect they're stale.
    const generation = (likeGenerationRef.current[commentId] ?? 0) + 1;
    likeGenerationRef.current[commentId] = generation;

    // Read from the synchronous ref to avoid stale-closure bugs on rapid taps.
    const prevLike = currentLikeRef.current[commentId] ?? null;
    const newLike: "like" | "dislike" | null = prevLike === action ? null : action;

    // Update ref immediately so the next tap sees the correct previous value.
    currentLikeRef.current[commentId] = newLike;

    // ── Optimistic UI: icon colour ─────────────────────────────────────────
    setUserLikes((prev) => {
      const next = { ...prev };
      if (newLike === null) delete next[commentId];
      else next[commentId] = newLike;
      return next;
    });

    // ── Optimistic UI: counts ──────────────────────────────────────────────
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

    // ── Debounce: cancel any pending timer, coalesce rapid taps ───────────
    const existingTimer = likeTimersRef.current.get(commentId);
    if (existingTimer) clearTimeout(existingTimer);

    const capturedUserId = userId;

    const timer = setTimeout(async () => {
      const desired   = pendingFinalLikeRef.current[commentId] ?? null;
      delete pendingFinalLikeRef.current[commentId];
      const committed = committedLikesRef.current[commentId] ?? null;

      // Nothing changed vs the last confirmed server state — skip the call.
      if (desired === committed) {
        likeTimersRef.current.delete(commentId);
        return;
      }

      const isLike = desired !== null ? desired === "like" : committed === "like";

      try {
        const data = await toggleCommentLike(id, commentId, capturedUserId, isLike);
        committedLikesRef.current[commentId] = desired;

        // Reconcile counts only if no newer tap has happened since this
        // debounce cycle started (guard: generation still matches).
        if (likeGenerationRef.current[commentId] === generation) {
          setCommentsList((prev) =>
            prev.map((c) =>
              c.id !== commentId ? c : { ...c, likeCount: data.likes, dislikeCount: data.dislikes }
            )
          );
        }
      } catch {
        // ── Server call failed — revert only if no newer interaction ────────
        if (likeGenerationRef.current[commentId] === generation) {
          currentLikeRef.current[commentId] = committed;

          setUserLikes((prev) => {
            const next = { ...prev };
            if (committed === null) delete next[commentId];
            else next[commentId] = committed;
            return next;
          });

          setCommentsList((prev) =>
            prev.map((c) => {
              if (c.id !== commentId) return c;
              let likes = c.likeCount, dislikes = c.dislikeCount;
              if (desired === "like")    likes    = Math.max(0, likes - 1);
              if (desired === "dislike") dislikes = Math.max(0, dislikes - 1);
              if (committed === "like")    likes    = likes + 1;
              if (committed === "dislike") dislikes = dislikes + 1;
              return { ...c, likeCount: likes, dislikeCount: dislikes };
            })
          );
        }
      } finally {
        // Guard lifted only after the server call resolves (success or failure).
        likeTimersRef.current.delete(commentId);
      }
    }, 600);

    likeTimersRef.current.set(commentId, timer);
  }

  return { userLikes, handleCommentLike };
}
