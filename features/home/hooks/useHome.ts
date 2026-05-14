import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getUserScansPaginated } from "@/lib/firestore-service";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useAvatar } from "@/contexts/AvatarContext";
import { queryClient } from "@/lib/query-client";
import {
  getCachedHomeScans,
  setCachedHomeScans,
  invalidateHomeScansCache,
} from "@/lib/cache/qr-cache";

export interface LocalScan {
  id: string;
  content: string;
  contentType: string;
  scannedAt: string;
  qrCodeId?: string;
}

// 5 min in-memory stale window — after a force-close the disk cache backs this up
const HOME_STALE_MS = 5 * 60 * 1000;
const HOME_QUERY_KEY = (uid: string) => ["home-recent-scans", uid] as const;

export function useHome() {
  const { user } = useAuth();
  const [localScans, setLocalScans] = useState<LocalScan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const notif = useNotifications();

  // ── Avatar: only fall back to Google photo if no app-uploaded avatar exists.
  // Checking `url` (raw stored value) prevents overriding a custom upload with
  // the Google account photo on every tab focus.
  const { url: appAvatarUrl, syncAvatar } = useAvatar();
  useEffect(() => {
    if (!appAvatarUrl && user?.photoURL) syncAvatar(user.photoURL);
  }, [user?.id, user?.photoURL, syncAvatar, appAvatarUrl]);

  // ── Disk pre-warm: seed the React Query cache from AsyncStorage before the
  //    network call fires so the list appears instantly on cold launch. ────────
  useEffect(() => {
    if (!user?.id) return;
    getCachedHomeScans<LocalScan[]>(user.id).then((cached) => {
      if (!cached || cached.length === 0) return;
      const qk = HOME_QUERY_KEY(user.id);
      const existing = queryClient.getQueryData<LocalScan[]>(qk);
      if (!existing || existing.length === 0) {
        queryClient.setQueryData(qk, cached);
      }
    }).catch(() => {});
  }, [user?.id]);

  // ── Cloud recent scans: last 5 from Firestore ─────────────────────────────
  // - staleTime: 5 min in-memory; disk cache extends this across force-closes.
  // - refetchOnMount: false — rely on pull-to-refresh for manual updates.
  // - On success the result is persisted to disk (30-min TTL) so the next cold
  //   launch pre-warms from disk instead of hitting Firestore.
  const {
    data: cloudScansRaw,
    refetch: refetchCloud,
    isLoading: cloudLoading,
  } = useQuery<LocalScan[]>({
    queryKey: HOME_QUERY_KEY(user?.id ?? ""),
    queryFn: async () => {
      const { items } = await getUserScansPaginated(user!.id, 5);
      const scans = items.map((s: any): LocalScan => ({
        id: s.id,
        content: s.content,
        contentType: s.contentType,
        scannedAt: s.scannedAt,
        qrCodeId: s.qrCodeId,
      }));
      // Persist for next cold launch (fire-and-forget)
      setCachedHomeScans<LocalScan[]>(user!.id, scans).catch(() => {});
      return scans;
    },
    staleTime: HOME_STALE_MS,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!user?.id,
    placeholderData: [],
  });

  // ── Pulse animation for the scan hero button ──────────────────────────────
  const scanPulse = useSharedValue(1);
  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1200 }), withTiming(1, { duration: 1200 })),
      -1, true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scanPulse.value }] }));

  // ── Local scans from device AsyncStorage ──────────────────────────────────
  // Re-read on every focus so newly-scanned codes (written by the scanner tab)
  // appear immediately when the user returns to Home.
  const loadLocalScans = useCallback(async (userId?: string | null) => {
    if (!userId) { setLocalScans([]); return; }
    try {
      const stored = await AsyncStorage.getItem(`local_scan_history_${userId}`);
      setLocalScans(stored ? JSON.parse(stored) : []);
    } catch {
      setLocalScans([]);
    }
  }, []);

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

  // ── Merge local + cloud; deduplicate by qrCodeId; take 5 most recent ──────
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

  // ── Pull-to-refresh: bust disk cache then re-fetch everything ─────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) invalidateHomeScansCache(user.id);
    await loadLocalScans(user?.id);
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: HOME_QUERY_KEY(user.id) });
      await refetchCloud();
    }
    setRefreshing(false);
  }, [loadLocalScans, user?.id, refetchCloud]);

  // ── Delete a local scan from AsyncStorage ─────────────────────────────────
  const deleteScan = useCallback(async (scanId: string) => {
    if (!user?.id) return;
    try {
      const stored = await AsyncStorage.getItem(`local_scan_history_${user.id}`);
      if (!stored) return;
      const updated = (JSON.parse(stored) as LocalScan[]).filter((s) => s.id !== scanId);
      await AsyncStorage.setItem(`local_scan_history_${user.id}`, JSON.stringify(updated));
      setLocalScans(updated);
    } catch {}
  }, [user?.id]);

  return {
    user,
    recentScans,
    isLoading: cloudLoading && (!cloudScansRaw || cloudScansRaw.length === 0),
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
