import { useEffect } from "react";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useAvatar } from "@/shared/contexts/AvatarContext";
import { useRecentScans } from "@/features/home/hooks/useRecentScans";

export function useHome() {
  const { user }                          = useAuth();
  const { url: appAvatarUrl, syncAvatar } = useAvatar();
  const { recentScans, isLoading, refreshing, onRefresh, deleteScan } = useRecentScans();

  // Always sync auth photoURL → AvatarContext on login or URL change.
  // syncAvatar is a no-op when the URL hasn't changed, so this is safe to
  // call unconditionally — removing the !appAvatarUrl guard that was blocking
  // syncs whenever AsyncStorage already had *any* (possibly stale) URL.
  useEffect(() => {
    if (user?.photoURL) syncAvatar(user.photoURL);
  }, [user?.id, user?.photoURL, syncAvatar]);

  return { user, recentScans, isLoading, refreshing, onRefresh, deleteScan };
}
