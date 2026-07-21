import { useState, useRef, useEffect, useCallback } from "react";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import { toggleFollow, getQrFollowersList, isUserFollowingQrCode, getQrFollowCount, type FollowerInfo } from "@/lib/firestore-service";
import { invalidateQrCache } from "@/services/cache/qr-cache";

const DEBOUNCE_MS = 700;

export function useQrFollow(id: string, userId: string | null, userDisplayName: string | null) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [followPressedIn, setFollowPressedIn] = useState(false);
  const [followersList, setFollowersList] = useState<FollowerInfo[]>([]);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  // Exposed so the screen can show a toast when a follow/unwatch write fails.
  const [followError, setFollowError] = useState<string | null>(null);

  const committedFollowingRef = useRef(false);
  const pendingFollowingRef = useRef(false);
  const isCommittingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<{ content: string; contentType: string } | null>(null);

  // Load the real initial follow state from Firestore on mount.
  // Without this, the hook always starts at false — causing the server to toggle
  // the wrong direction when the user first taps (unwatch instead of watch).
  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;
    Promise.all([
      isUserFollowingQrCode(id, userId),
      getQrFollowCount(id),
    ]).then(([following, count]) => {
      if (cancelled) return;
      committedFollowingRef.current = following;
      pendingFollowingRef.current = following;
      setIsFollowing(following);
      setFollowCount(count);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id, userId]);

  // Clear pending debounce timer on unmount so we don't submit a stale write
  // after the component tree is gone (the write itself is idempotent but the
  // subsequent setState calls on stale refs waste work).
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const commitFollow = useCallback(async () => {
    if (!userId) return;
    if (isCommittingRef.current) return;

    const desiredState = pendingFollowingRef.current;
    if (desiredState === committedFollowingRef.current) return;

    isCommittingRef.current = true;
    setFollowLoading(true);
    try {
      const result = await toggleFollow(id, userId, contentRef.current?.content ?? "", contentRef.current?.contentType ?? "", userDisplayName || undefined);
      committedFollowingRef.current = result.isFollowing;
      setIsFollowing(result.isFollowing);
      setFollowCount(result.followCount);
      invalidateQrCache(id);

      // If user changed their mind while request was in-flight, schedule a sync
      if (pendingFollowingRef.current !== result.isFollowing) {
        isCommittingRef.current = false;
        setFollowLoading(false);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(commitFollow, DEBOUNCE_MS);
        return;
      }
    } catch {
      // Roll back to the last confirmed server state and surface the error.
      const confirmed = committedFollowingRef.current;
      setIsFollowing(confirmed);
      setFollowCount((prev) => confirmed ? prev + 1 : Math.max(0, prev - 1));
      pendingFollowingRef.current = confirmed;
      setFollowError("Couldn't update. Please try again.");
    } finally {
      isCommittingRef.current = false;
      setFollowLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId, userDisplayName]);

  function handleToggleFollow(content: string, contentType: string) {
    if (!userId) { router.push("/(auth)/login"); return; }

    const newFollowing = !pendingFollowingRef.current;
    pendingFollowingRef.current = newFollowing;
    contentRef.current = { content, contentType };

    setIsFollowing(newFollowing);
    setFollowCount((prev) => newFollowing ? prev + 1 : Math.max(0, prev - 1));
    // Activate loading immediately so the button is disabled through the full
    // debounce window + write cycle, not just during the Firestore write itself.
    setFollowLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(commitFollow, DEBOUNCE_MS);
  }

  async function handleLoadFollowers() {
    setFollowersLoading(true);
    try {
      const list = await getQrFollowersList(id);
      setFollowersList(list);
    } catch {}
    setFollowersLoading(false);
  }

  function syncCommittedState(following: boolean, count: number) {
    // Only sync from server if no local action is pending or in-flight
    if (pendingFollowingRef.current !== committedFollowingRef.current || isCommittingRef.current) return;
    committedFollowingRef.current = following;
    pendingFollowingRef.current = following;
    setIsFollowing(following);
    setFollowCount(count);
  }

  return {
    isFollowing, setIsFollowing: (v: boolean) => { committedFollowingRef.current = v; pendingFollowingRef.current = v; setIsFollowing(v); },
    followCount, setFollowCount,
    followLoading,
    followError, clearFollowError: () => setFollowError(null),
    followPressedIn, setFollowPressedIn,
    followersList,
    followersModalOpen, setFollowersModalOpen,
    followersLoading,
    handleToggleFollow,
    handleLoadFollowers,
    syncCommittedState,
  };
}
