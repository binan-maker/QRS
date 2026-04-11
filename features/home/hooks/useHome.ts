import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/lib/haptics";
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToNotifications,
  subscribeToNotificationCount,
  markAllNotificationsRead,
  clearAllNotifications,
  getUserPhotoURL,
  type Notification,
} from "@/lib/firestore-service";

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
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [markingRead, setMarkingRead] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(user?.photoURL || null);

  const scanPulse = useSharedValue(1);
  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1200 }), withTiming(1, { duration: 1200 })),
      -1, true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scanPulse.value }] }));

  useEffect(() => {
    setPhotoURL(user?.photoURL || null);
    if (!user) return;
    getUserPhotoURL(user.id).then((photo) => {
      if (photo) setPhotoURL(photo);
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user) { setNotifCount(0); return; }
    const unsub = subscribeToNotificationCount(user.id, setNotifCount);
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    if (!user || !notifOpen) return;
    const unsub = subscribeToNotifications(user.id, setNotifications);
    return unsub;
  }, [user?.id, notifOpen]);

  async function handleOpenNotifications() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifOpen(true);
    if (user && notifCount > 0) {
      setMarkingRead(true);
      await markAllNotificationsRead(user.id).catch(() => {});
      setMarkingRead(false);
    }
  }

  async function handleClearNotifications() {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await clearAllNotifications(user.id).catch(() => {});
    setNotifications([]);
  }

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

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      setRecentScans([]);
    }
    loadRecentScans(currentUserId);
  }, [user?.id]);

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
    notifCount,
    notifOpen,
    setNotifOpen,
    notifications,
    markingRead,
    pulseStyle,
    handleOpenNotifications,
    handleClearNotifications,
  };
}
