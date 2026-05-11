import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getUserScansPaginated } from "@/lib/firestore-service";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useAvatar } from "@/contexts/AvatarContext";

export interface LocalScan {
  id: string;
  content: string;
  contentType: string;
  scannedAt: string;
  qrCodeId?: string;
}

const HOME_STALE_MS = 5 * 60 * 1000;

export function useHome() {
  const { user } = useAuth();
  const [localScans, setLocalScans] = useState<LocalScan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const notif = useNotifications();

  // ── Avatar: from shared AvatarContext (no extra network call here) ───────────
  const { syncAvatar } = useAvatar();

  // Seed the context with the user's known photoURL whenever the user changes,
  // so the avatar is immediately available from auth state on first paint.
  useEffect(() => {
    if (user?.photoURL) syncAvatar(user.photoURL);
  }, [user?.id, user?.photoURL, syncAvatar]);

  // ── Cloud recent scans: last 5 from Firestore (no time restriction) ────────
  const {
    data: cloudScansRaw,
    refetch: refetchCloud,
  } = useQuery<LocalScan[]>({
    queryKey: ["home-recent-scans", user?.id],
    queryFn: async () => {
      const { items } = await getUserScansPaginated(user!.id, 5);
      return items.map((s: any): LocalScan => ({
        id: s.id,
        content: s.content,
        contentType: s.contentType,
        scannedAt: s.scannedAt,
        qrCodeId: s.qrCodeId,
      }));
    },
    staleTime: HOME_STALE_MS,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!user?.id,
    placeholderData: [],
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

  const loadLocalScans = useCallback(async (userId?: string | null) => {
    if (!userId) { setLocalScans([]); return; }
    try {
      const stored = await AsyncStorage.getItem(`local_scan_history_${userId}`);
      if (stored) {
        const all: LocalScan[] = JSON.parse(stored);
        setLocalScans(all);
      } else {
        setLocalScans([]);
      }
    } catch {
      setLocalScans([]);
    }
  }, []);

  // Refresh on tab focus; reset on user change
  useFocusEffect(
    useCallback(() => {
      const currentUserId = user?.id ?? null;
      if (prevUserIdRef.current !== currentUserId) {
        prevUserIdRef.current = currentUserId;
        setLocalScans([]);
      }
      loadLocalScans(currentUserId);
    }, [user?.id, loadLocalScans])
  );

  // Merge local + cloud; deduplicate by qrCodeId; take 5 most recent
  const recentScans: LocalScan[] = (() => {
    const cloud: LocalScan[] = cloudScansRaw ?? [];
    const merged: LocalScan[] = [...localScans];
    for (const c of cloud) {
      if (!merged.find((l) => l.qrCodeId && l.qrCodeId === c.qrCodeId)) {
        merged.push(c);
      }
    }
    return merged
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, 5);
  })();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLocalScans(user?.id);
    if (user?.id) await refetchCloud();
    setRefreshing(false);
  }, [loadLocalScans, user?.id, refetchCloud]);

  const deleteScan = useCallback(async (scanId: string) => {
    if (!user?.id) return;
    try {
      const stored = await AsyncStorage.getItem(`local_scan_history_${user.id}`);
      if (!stored) return;
      const all: LocalScan[] = JSON.parse(stored);
      const updated = all.filter((s) => s.id !== scanId);
      await AsyncStorage.setItem(`local_scan_history_${user.id}`, JSON.stringify(updated));
      setLocalScans(updated);
    } catch {}
  }, [user?.id]);

  return {
    user,
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
