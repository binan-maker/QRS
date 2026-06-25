import { useEffect } from "react";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useAvatar } from "@/shared/contexts/AvatarContext";
import { useRecentScans } from "@/features/home/hooks/useRecentScans";

export function useHome() {
  const { user }                                        = useAuth();
  const { url: appAvatarUrl, isHydrated, syncAvatar }   = useAvatar();
  const { recentScans, isLoading, refreshing, onRefresh, deleteScan } = useRecentScans();

  // Only use the Firebase Auth photoURL (which is the Google profile picture for
  // Google sign-in users) as a fallback when AvatarContext has fully loaded from
  // AsyncStorage and still found nothing.  This prevents the Google photo from
  // overwriting an app-uploaded photo that was already stored in AsyncStorage or
  // pushed via syncAvatarFromOutside() by the AuthContext prefetchQuery.
  useEffect(() => {
    if (user?.photoURL && isHydrated && !appAvatarUrl) {
      syncAvatar(user.photoURL);
    }
  }, [user?.id, user?.photoURL, isHydrated, appAvatarUrl, syncAvatar]);

  return { user, recentScans, isLoading, refreshing, onRefresh, deleteScan };
}
