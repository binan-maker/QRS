import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAvatar } from "@/contexts/AvatarContext";
import { useNotifications } from "@/shared/components/notifications/hooks/useNotifications";
import { useRecentScans } from "@/features/home/hooks/useRecentScans";

export function useHome() {
  const { user }                          = useAuth();
  const { url: appAvatarUrl, syncAvatar } = useAvatar();
  const notif                             = useNotifications();
  const { recentScans, isLoading, refreshing, onRefresh, deleteScan } = useRecentScans();

  useEffect(() => {
    if (!appAvatarUrl && user?.photoURL) syncAvatar(user.photoURL);
  }, [user?.id, user?.photoURL, syncAvatar, appAvatarUrl]);

  return {
    user,
    recentScans,
    isLoading,
    refreshing,
    onRefresh,
    deleteScan,
    notifCount:               notif.notifCount,
    notifOpen:                notif.notifOpen,
    setNotifOpen:             notif.setNotifOpen,
    notifications:            notif.notifications,
    markingRead:              notif.markingRead,
    handleOpenNotifications:  notif.handleOpenNotifications,
    handleClearNotifications: notif.handleClearNotifications,
  };
}
