import { useState, useRef, useEffect, useCallback } from "react";
import * as Haptics from "@/shared/utils/haptics";
import {
  isUserFollowingCreator,
  toggleFollowCreator,
  getCreatorFollowerCount,
  getCreatorFollowersList,
  type FollowerInfo,
} from "@/lib/firestore-service";

const DEBOUNCE_MS = 700;

export function useCreatorFollow(
  creatorId: string | null,
  userId: string | null,
  userDisplayName: string | null,
  creatorName?: string | null
) {
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const [creatorFollowerCount, setCreatorFollowerCount] = useState(0);
  const [creatorFollowLoading, setCreatorFollowLoading] = useState(false);
  const [creatorFollowersList, setCreatorFollowersList] = useState<FollowerInfo[]>([]);
  const [creatorFollowersModalOpen, setCreatorFollowersModalOpen] = useState(false);
  const [creatorFollowersLoading, setCreatorFollowersLoading] = useState(false);
  // Exposed so the screen can show a toast when the follow/unfollow write fails.
  const [creatorFollowError, setCreatorFollowError] = useState<string | null>(null);

  const committedRef = useRef(false);
  const pendingRef = useRef(false);
  const isCommittingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!creatorId || !userId) return;
    let cancelled = false;
    Promise.all([
      isUserFollowingCreator(creatorId, userId),
      getCreatorFollowerCount(creatorId),
    ]).then(([following, count]) => {
      if (cancelled) return;
      committedRef.current = following;
      pendingRef.current = following;
      setIsFollowingCreator(following);
      setCreatorFollowerCount(count);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [creatorId, userId]);

  // Clear pending debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const commitFollow = useCallback(async () => {
    if (!creatorId || !userId) return;
    if (isCommittingRef.current) return;
    const desiredState = pendingRef.current;
    if (desiredState === committedRef.current) return;
    isCommittingRef.current = true;
    setCreatorFollowLoading(true);
    try {
      const result = await toggleFollowCreator(
        creatorId, userId,
        userDisplayName || undefined,
        creatorName || undefined
      );
      committedRef.current = result.isFollowing;
      setIsFollowingCreator(result.isFollowing);
      setCreatorFollowerCount(result.followerCount);
      if (pendingRef.current !== result.isFollowing) {
        isCommittingRef.current = false;
        setCreatorFollowLoading(false);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(commitFollow, DEBOUNCE_MS);
        return;
      }
    } catch {
      // Roll back to the last confirmed server state and surface the error.
      const confirmed = committedRef.current;
      setIsFollowingCreator(confirmed);
      setCreatorFollowerCount((prev) => confirmed ? prev + 1 : Math.max(0, prev - 1));
      pendingRef.current = confirmed;
      setCreatorFollowError("Couldn't update. Please try again.");
    } finally {
      isCommittingRef.current = false;
      setCreatorFollowLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorId, userId, userDisplayName, creatorName]);

  function handleToggleFollowCreator() {
    if (!userId || !creatorId) return;
    const newFollowing = !pendingRef.current;
    pendingRef.current = newFollowing;
    setIsFollowingCreator(newFollowing);
    setCreatorFollowerCount((prev) => newFollowing ? prev + 1 : Math.max(0, prev - 1));
    setCreatorFollowLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(commitFollow, DEBOUNCE_MS);
  }

  async function handleLoadCreatorFollowers() {
    if (!creatorId) return;
    setCreatorFollowersLoading(true);
    try {
      const list = await getCreatorFollowersList(creatorId);
      setCreatorFollowersList(list);
    } catch {}
    setCreatorFollowersLoading(false);
  }

  return {
    isFollowingCreator,
    creatorFollowerCount,
    creatorFollowLoading,
    creatorFollowError, clearCreatorFollowError: () => setCreatorFollowError(null),
    creatorFollowersList,
    creatorFollowersModalOpen,
    setCreatorFollowersModalOpen,
    creatorFollowersLoading,
    handleToggleFollowCreator,
    handleLoadCreatorFollowers,
  };
}
