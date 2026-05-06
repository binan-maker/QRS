import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getUserPhotoURL } from "@/lib/firestore-service";
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
  const notif = useNotifications();

  // ── Photo URL: React Query (5 min stale, 30 min cache) ──────────────────────
  const { data: photoURL = null } = useQuery<string | null>({
    queryKey: ["photoURL", user?.id],
    queryFn: () => getUserPhotoURL(user!.id),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!user?.id,
    placeholderData: user?.photoURL ?? null,
  });

  // ── Pulse animation for the scan hero button ────────────────────────────────
  const scanPulse = useSharedValue(1);
  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1200 }), withTiming(1, { duration: 1200 })),
      -1, true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scanPulse.value }] }));

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

  // Load only when the home tab is focused — not on every mount
  useFocusEffect(
    useCallback(() => {
      const currentUserId = user?.id ?? null;
      if (prevUserIdRef.current !== currentUserId) {
        prevUserIdRef.current = currentUserId;
        setRecentScans([]);
      }
      loadRecentScans(currentUserId);
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
    photoURL: photoURL ?? user?.photoURL ?? null,
    recentScans,
    refreshing,
    onRefresh,
    deleteScan,
    pulseStyle,
    notifCount: notif.notifCount,
    notifOpen: notif.notifOpen,
    setNotifOpen: notif.setNotifOpen,
    notifications: notif.notifications,
    markingRead: notif.markingRead,
    handleOpenNotifications: notif.handleOpenNotifications,
    handleClearNotifications: notif.handleClearNotifications,
  };
}
