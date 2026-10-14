import { useState, useEffect, useRef, useMemo, type Dispatch, type SetStateAction } from "react";
import * as Haptics from "@/shared/utils/haptics";
import { toggleCommentLike, getCommentUserLikes } from "@/lib/data-service";
import { router } from "expo-router";
import type { CommentItem } from "@/features/qr-detail/types";

interface UseCommentLikesParams {
  id: string;
  userId: string | null;
  commentsList: CommentItem[];
  setCommentsList: Dispatch<SetStateAction<CommentItem[]>>;
}

export function useCommentLikes({ id, userId, commentsList, setCommentsList }: UseCommentLikesParams) {
  const [userLikes, setUserLikes] = useState<Record<string, "like" | "dislike">>({});
  const currentLikeRef = useRef<Record<string, "like" | "dislike" | null>>({});
  const committedLikesRef = useRef<Record<string, "like" | "dislike" | null>>({});
  const pendingFinalLikeRef = useRef<Record<string, "like" | "dislike" | null>>({});
  const likeGenRef = useRef<Record<string, number>>({});
  const likeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const commentIdsKey = useMemo(() => commentsList.map((c) => c.id).join(","), [commentsList]);

  useEffect(() => () => { likeTimersRef.current.forEach((t) => clearTimeout(t)); likeTimersRef.current.clear(); }, []);

  useEffect(() => {
    if (!userId || !commentsList.length) return;
    getCommentUserLikes(id, commentsList.map((c) => c.id), userId).then((likes) => {
      setUserLikes((prev) => {
        const next = { ...prev };
        Object.entries(likes).forEach(([cid, val]) => {
          if (!likeTimersRef.current.has(cid)) {
            if (!val) delete next[cid]; else next[cid] = val as "like" | "dislike";
          }
        });
        return next;
      });
      Object.entries(likes).forEach(([cid, val]) => {
        if (!likeTimersRef.current.has(cid)) {
          committedLikesRef.current[cid] = (val as "like" | "dislike" | null) ?? null;
          currentLikeRef.current[cid] = (val as "like" | "dislike" | null) ?? null;
        }
      });
    });
  }, [commentIdsKey, userId, id]);

  function handleCommentLike(commentId: string, action: "like" | "dislike") {
    if (!userId) { router.push("/(auth)/login"); return; }

    const gen = (likeGenRef.current[commentId] ?? 0) + 1;
    likeGenRef.current[commentId] = gen;

    const prevLike = currentLikeRef.current[commentId] ?? null;
    const newLike = prevLike === action ? null : action;
    currentLikeRef.current[commentId] = newLike;

    setUserLikes((prev) => {
      const next = { ...prev };
      if (!newLike) delete next[commentId]; else next[commentId] = newLike;
      return next;
    });

    setCommentsList((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        let likes = c.likeCount, dislikes = c.dislikeCount;
        if (action === "like") {
          likes = newLike === "like" ? likes + 1 : Math.max(0, likes - 1);
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

    const existing = likeTimersRef.current.get(commentId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      const desired = pendingFinalLikeRef.current[commentId] ?? null;
      delete pendingFinalLikeRef.current[commentId];
      const committed = committedLikesRef.current[commentId] ?? null;

      if (desired === committed) {
        if (likeGenRef.current[commentId] === gen) likeTimersRef.current.delete(commentId);
        return;
      }

      try {
        const data = await toggleCommentLike(id, commentId, userId, desired !== null ? desired === "like" : committed === "like");
        committedLikesRef.current[commentId] = desired;
        if (likeGenRef.current[commentId] === gen) {
          setCommentsList((prev) => prev.map((c) => (c.id !== commentId ? c : { ...c, likeCount: data.likes, dislikeCount: data.dislikes })));
        }
      } catch {
        if (likeGenRef.current[commentId] === gen) {
          currentLikeRef.current[commentId] = committed;
          setUserLikes((prev) => {
            const next = { ...prev };
            if (!committed) delete next[commentId]; else next[commentId] = committed;
            return next;
          });
          setCommentsList((prev) =>
            prev.map((c) => {
              if (c.id !== commentId) return c;
              let likes = c.likeCount + (committed === "like" ? 1 : desired === "like" ? -1 : 0);
              let dislikes = c.dislikeCount + (committed === "dislike" ? 1 : desired === "dislike" ? -1 : 0);
              return { ...c, likeCount: Math.max(0, likes), dislikeCount: Math.max(0, dislikes) };
            })
          );
        }
      } finally {
        if (likeGenRef.current[commentId] === gen) likeTimersRef.current.delete(commentId);
      }
    }, 600);

    likeTimersRef.current.set(commentId, timer);
  }

  return { userLikes, handleCommentLike };
}
