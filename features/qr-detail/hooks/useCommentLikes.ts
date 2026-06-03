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
  // Holds the active debounce timer *and* acts as a guard for the useEffect:
  // while a commentId key is present, the effect will not overwrite userLikes
  // for that comment (prevents a mid-flight Firestore read from clobbering the
  // optimistic UI). The key is deleted only AFTER the server call resolves so
  // the guard stays active during the entire round-trip.
  const likeTimersRef       = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Stable comment-ID string — only changes when comments are added/removed ─
  // Using the full `commentsList` object as a useEffect dep would re-run the
  // Firestore fetch on every optimistic count update, producing a rapid series
  // of reads that race with in-flight toggles and overwrite the optimistic UI.
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
          // Skip any comment whose timer (or in-flight request) is still active.
          if (likeTimersRef.current.has(cid)) return;
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
        currentLikeRef.current[cid]    = val;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentIdsKey, userId, id]);
  // ↑ Intentionally using commentIdsKey (not commentsList) so this only
  //   re-runs when comments are added/removed, not on every count change.

  function handleCommentLike(commentId: string, action: "like" | "dislike") {
    if (!userId) { router.push("/(auth)/login"); return; }

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
      // NOTE: do NOT delete from likeTimersRef here. The key stays as a guard
      // for the useEffect until the server round-trip finishes (see `finally`).

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

        // Reconcile counts with the authoritative server value.
        setCommentsList((prev) =>
          prev.map((c) =>
            c.id !== commentId ? c : { ...c, likeCount: data.likes, dislikeCount: data.dislikes }
          )
        );
      } catch {
        // ── Server call failed — revert optimistic UI to the last committed state ─
        currentLikeRef.current[commentId] = committed;

        setUserLikes((prev) => {
          const next = { ...prev };
          if (committed === null) delete next[commentId];
          else next[commentId] = committed;
          return next;
        });

        // Revert the count delta that was applied optimistically.
        setCommentsList((prev) =>
          prev.map((c) => {
            if (c.id !== commentId) return c;
            let likes = c.likeCount, dislikes = c.dislikeCount;
            // Undo the desired change
            if (desired === "like")    likes    = Math.max(0, likes - 1);
            if (desired === "dislike") dislikes = Math.max(0, dislikes - 1);
            // Re-apply the committed state
            if (committed === "like")    likes    = likes + 1;
            if (committed === "dislike") dislikes = dislikes + 1;
            return { ...c, likeCount: likes, dislikeCount: dislikes };
          })
        );
      } finally {
        // Guard lifted only after the server call resolves (success or failure).
        // This prevents the useEffect from reading a stale Firestore snapshot
        // during the async round-trip and clobbering the optimistic state.
        likeTimersRef.current.delete(commentId);
      }
    }, 600);

    likeTimersRef.current.set(commentId, timer);
  }

  return { userLikes, handleCommentLike };
}
