import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { useAuth } from "@/contexts/AuthContext";
import { getUserPhotoURL } from "@/lib/firestore-service";
import { getCachedPhotoURL, setCachedPhotoURL } from "@/lib/cache/qr-cache";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";

export interface LocalScan {
  id: string;
  content: string;
  contentType: string;
  scannedAt: string;
  qrCodeId?: string;
}

export function useHome() {
  const { user } = useAuth();
  const [recentScans, setRecentScans] = useState<LocalScan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const photoFetchedForRef = useRef<string | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(user?.photoURL || null);

  const notif = useNotifications();

  const scanPulse = useSharedValue(1);
  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1200 }), withTiming(1, { duration: 1200 })),
      -1, true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scanPulse.value }] }));

  // Reset local UI state when the user changes; defer remote fetches to focus.
  useEffect(() => {
    setPhotoURL(user?.photoURL || null);
    photoFetchedForRef.current = null;
    if (!user) return;
    // Hydrate photo from cache instantly so no flicker.
    getCachedPhotoURL(user.id).then((cached) => {
      if (cached) setPhotoURL(cached);
    }).catch(() => {});
  }, [user?.id]);

  const loadRecentScans = useCallback(async (userId?: string | null) => {
    if (!userId) { setRecentScans([]); return; }
    try {
      const stored = await AsyncStorage.getItem(`local_scan_history_${userId}`);
      if (stored) {
        const all: LocalScan[] = JSON.parse(stored);
        setRecentScans(all.slice(0, 5));
      } else {
        setRecentScans([]);
      }
    } catch {}
  }, []);

  // Load only when the home tab is focused — not on first mount of every tab.
  useFocusEffect(
    useCallback(() => {
      const currentUserId = user?.id ?? null;
      if (prevUserIdRef.current !== currentUserId) {
        prevUserIdRef.current = currentUserId;
        setRecentScans([]);
      }
      loadRecentScans(currentUserId);

      if (currentUserId && photoFetchedForRef.current !== currentUserId) {
        photoFetchedForRef.current = currentUserId;
        getUserPhotoURL(currentUserId).then((photo) => {
          if (photo) {
            setPhotoURL(photo);
            setCachedPhotoURL(currentUserId, photo).catch(() => {});
          }
        }).catch(() => {});
      }
    }, [user?.id, loadRecentScans])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecentScans(user?.id);
    setRefreshing(false);
  }, [loadRecentScans, user?.id]);

  const deleteScan = useCallback(async (scanId: string) => {
    if (!user?.id) return;
    try {
      const stored = await AsyncStorage.getItem(`local_scan_history_${user.id}`);
      if (!stored) return;
      const all: LocalScan[] = JSON.parse(stored);
      const updated = all.filter((s) => s.id !== scanId);
      await AsyncStorage.setItem(`local_scan_history_${user.id}`, JSON.stringify(updated));
      setRecentScans(updated.slice(0, 5));
    } catch {}
  }, [user?.id]);

  return {
    user,
    photoURL,
    recentScans,
    refreshing,
    onRefresh,
    deleteScan,
    notifCount: notif.notifCount,
    notifOpen: notif.notifOpen,
    setNotifOpen: notif.setNotifOpen,
    notifications: notif.notifications,
    markingRead: notif.markingRead,
    pulseStyle,
    handleOpenNotifications: notif.handleOpenNotifications,
    handleClearNotifications: notif.handleClearNotifications,
  };
}
