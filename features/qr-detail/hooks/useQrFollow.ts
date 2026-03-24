import { useState } from "react";
import { router } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { toggleFollow, getQrFollowersList, type FollowerInfo } from "@/lib/firestore-service";
import { invalidateQrCache } from "@/lib/cache/qr-cache";

export function useQrFollow(id: string, userId: string | null, userDisplayName: string | null) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [followPressedIn, setFollowPressedIn] = useState(false);
  const [followersList, setFollowersList] = useState<FollowerInfo[]>([]);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);

  async function handleToggleFollow(content: string, contentType: string) {
    if (!userId) { router.push("/(auth)/login"); return; }
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);
    setFollowCount((prev) => newFollowing ? prev + 1 : Math.max(0, prev - 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await toggleFollow(id, userId, content, contentType, userDisplayName || undefined);
      setIsFollowing(result.isFollowing);
      setFollowCount(result.followCount);
      invalidateQrCache(id);
    } catch {
      setIsFollowing(!newFollowing);
      setFollowCount((prev) => newFollowing ? Math.max(0, prev - 1) : prev + 1);
    }
  }

  async function handleLoadFollowers() {
    setFollowersLoading(true);
    try {
      const list = await getQrFollowersList(id);
      setFollowersList(list);
    } catch {}
    setFollowersLoading(false);
  }

  return {
    isFollowing, setIsFollowing,
    followCount, setFollowCount,
    followLoading,
    followPressedIn, setFollowPressedIn,
    followersList,
    followersModalOpen, setFollowersModalOpen,
    followersLoading,
    handleToggleFollow,
    handleLoadFollowers,
  };
}
