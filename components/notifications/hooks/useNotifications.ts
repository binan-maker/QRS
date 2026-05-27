import { useCallback, useEffect, useState } from "react";
import * as Haptics from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToNotifications,
  subscribeToNotificationCount,
  markAllNotificationsRead,
  clearAllNotifications,
  type Notification,
} from "@/lib/firestore-service";

type CountListener = (count: number) => void;

let countCache: { userId: string | null; value: number } = { userId: null, value: 0 };
let countListeners: Set<CountListener> = new Set();
let countUnsub: (() => void) | null = null;
let countSubscribedFor: string | null = null;

function ensureCountSubscription(userId: string | null) {
  if (countSubscribedFor === userId) return;
  if (countUnsub) {
    countUnsub();
    countUnsub = null;
  }
  countSubscribedFor = userId;
  if (!userId) {
    countCache = { userId: null, value: 0 };
    countListeners.forEach((l) => l(0));
    return;
  }
  countUnsub = subscribeToNotificationCount(userId, (n) => {
    countCache = { userId, value: n };
    countListeners.forEach((l) => l(n));
  });
}

function teardownCountIfUnused() {
  if (countListeners.size === 0 && countUnsub) {
    countUnsub();
    countUnsub = null;
    countSubscribedFor = null;
  }
}

/**
 * Single shared notification-count subscription per user.
 * Multiple components can mount this hook without opening duplicate
 * Firestore listeners. The Firestore listener is torn down once the
 * last subscriber unmounts.
 */
export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [count, setCount] = useState<number>(
    countCache.userId === userId ? countCache.value : 0
  );
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    countListeners.add(setCount);
    ensureCountSubscription(userId);
    if (countCache.userId === userId) setCount(countCache.value);
    else setCount(0);
    return () => {
      countListeners.delete(setCount);
      teardownCountIfUnused();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !notifOpen) return;
    const unsub = subscribeToNotifications(userId, setNotifications);
    return unsub;
  }, [userId, notifOpen]);

  const handleOpenNotifications = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifOpen(true);
    if (userId && countCache.value > 0) {
      setMarkingRead(true);
      await markAllNotificationsRead(userId).catch(() => {});
      setMarkingRead(false);
    }
  }, [userId]);

  const handleClearNotifications = useCallback(async () => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await clearAllNotifications(userId).catch(() => {});
    setNotifications([]);
  }, [userId]);

  return {
    notifCount: count,
    notifOpen,
    setNotifOpen,
    notifications,
    markingRead,
    handleOpenNotifications,
    handleClearNotifications,
  };
}
