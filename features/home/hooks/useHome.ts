import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAvatar } from "@/contexts/AvatarContext";
import { useRecentScans } from "@/features/home/hooks/useRecentScans";

export function useHome() {
  const { user }                          = useAuth();
  const { url: appAvatarUrl, syncAvatar } = useAvatar();
  const { recentScans, isLoading, refreshing, onRefresh, deleteScan } = useRecentScans();

  useEffect(() => {
    if (!appAvatarUrl && user?.photoURL) syncAvatar(user.photoURL);
  }, [user?.id, user?.photoURL, syncAvatar, appAvatarUrl]);

  return { user, recentScans, isLoading, refreshing, onRefresh, deleteScan };
}
