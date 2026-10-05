import { useEffect } from "react";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useAvatar, isUserUploadedPhoto } from "@/shared/contexts/AvatarContext";
import { useRecentScans } from "@/features/home/hooks/useRecentScans";

export function useHome() {
  const { user }                                        = useAuth();
  const { url: appAvatarUrl, isHydrated, syncAvatar }   = useAvatar();
  const { recentScans, isLoading, refreshing, onRefresh, deleteScan } = useRecentScans();

  // If user.photoURL is an app-uploaded photo, sync it immediately.
  // If it's a Google default photo, only use it as a fallback AFTER AvatarContext
  // has finished querying Supabase public.users (isHydrated === true) and found no custom photo.
  useEffect(() => {
    if (!user?.photoURL) return;
    if (isUserUploadedPhoto(user.photoURL)) {
      syncAvatar(user.photoURL);
    } else if (isHydrated && !appAvatarUrl) {
      syncAvatar(user.photoURL);
    }
  }, [user?.id, user?.photoURL, isHydrated, appAvatarUrl, syncAvatar]);

  return { user, recentScans, isLoading, refreshing, onRefresh, deleteScan };
}
