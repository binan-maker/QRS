import { useState, useRef } from "react";
import { router } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { toggleFollow, getQrFollowersList, type FollowerInfo } from "@/lib/firestore-service";
import { invalidateQrCache } from "@/lib/cache/qr-cache";

const DEBOUNCE_MS = 700;

export function useQrFollow(id: string, userId: string | null, userDisplayName: string | null) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [followPressedIn, setFollowPressedIn] = useState(false);
  const [followersList, setFollowersList] = useState<FollowerInfo[]>([]);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);

  const committedFollowingRef = useRef(false);
  const pendingFollowingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<{ content: string; contentType: string } | null>(null);

  async function commitFollow() {
    if (!userId) return;
    const desiredState = pendingFollowingRef.current;
    if (desiredState === committedFollowingRef.current) return;

    setFollowLoading(true);
    try {
      const result = await toggleFollow(id, userId, contentRef.current?.content ?? "", contentRef.current?.contentType ?? "", userDisplayName || undefined);
      committedFollowingRef.current = result.isFollowing;
      setIsFollowing(result.isFollowing);
      setFollowCount(result.followCount);
      invalidateQrCache(id);
      if (result.isFollowing !== desiredState) {
        pendingFollowingRef.current = result.isFollowing;
      }
    } catch {
      setIsFollowing(committedFollowingRef.current);
      setFollowCount((prev) => committedFollowingRef.current ? prev + 1 : Math.max(0, prev - 1));
      pendingFollowingRef.current = committedFollowingRef.current;
    } finally {
      setFollowLoading(false);
    }
  }

  function handleToggleFollow(content: string, contentType: string) {
    if (!userId) { router.push("/(auth)/login"); return; }

    const newFollowing = !pendingFollowingRef.current;
    pendingFollowingRef.current = newFollowing;
    contentRef.current = { content, contentType };

    setIsFollowing(newFollowing);
    setFollowCount((prev) => newFollowing ? prev + 1 : Math.max(0, prev - 1));
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
    committedFollowingRef.current = following;
    pendingFollowingRef.current = following;
    setIsFollowing(following);
    setFollowCount(count);
  }

  return {
    isFollowing, setIsFollowing: (v: boolean) => { committedFollowingRef.current = v; pendingFollowingRef.current = v; setIsFollowing(v); },
    followCount, setFollowCount,
    followLoading,
    followPressedIn, setFollowPressedIn,
    followersList,
    followersModalOpen, setFollowersModalOpen,
    followersLoading,
    handleToggleFollow,
    handleLoadFollowers,
    syncCommittedState,
  };
}
