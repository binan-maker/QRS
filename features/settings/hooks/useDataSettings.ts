import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/shared/utils/haptics";
import {
  getUserFollowing,
  getUserComments,
  softDeleteComment,
  deleteAllUserComments,
  getUserScansPaginated,
  deleteUserScan,
  deleteAllUserScans,
} from "@/lib/firestore-service";
import {
  getCachedFollowing,
  setCachedFollowing,
  invalidateFollowingCache,
  getCachedComments,
  setCachedComments,
  invalidateCommentsCache,
} from "@/services/cache/qr-cache";

interface UseDataSettingsOptions {
  userId: string | undefined;
}

export function useDataSettings({ userId }: UseDataSettingsOptions) {
  const [followingList,   setFollowingList]   = useState<any[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [myComments,      setMyComments]       = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading]  = useState(false);
  const [myHistory,       setMyHistory]        = useState<any[]>([]);
  const [historyLoading,  setHistoryLoading]   = useState(false);

  // Guard: prevents state updates after the hook's owner unmounts.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // FIX (rollback closure): keep live refs to current list values so that
  // the rollback inside handleDeleteAll* always restores the freshest snapshot,
  // even if the list changed between when the callback was created and when
  // the user confirms the alert.
  const myCommentsRef = useRef(myComments);
  const myHistoryRef  = useRef(myHistory);
  useEffect(() => { myCommentsRef.current = myComments; }, [myComments]);
  useEffect(() => { myHistoryRef.current  = myHistory;  }, [myHistory]);

  const resetData = useCallback(() => {
    setFollowingList([]);
    setMyComments([]);
    setMyHistory([]);
  }, []);

  const loadFollowing = useCallback(async (forceRefresh = false) => {
    if (!userId) return;
    setFollowingLoading(true);
    try {
      if (!forceRefresh) {
        const cached = await getCachedFollowing<any[]>(userId);
        if (cached) {
          if (mountedRef.current) { setFollowingList(cached); setFollowingLoading(false); }
          return;
        }
      }
      const list = await getUserFollowing(userId);
      setCachedFollowing<any[]>(userId, list).catch(() => {});
      if (mountedRef.current) setFollowingList(list);
    } catch {}
    if (mountedRef.current) setFollowingLoading(false);
  }, [userId]);

  const loadMyComments = useCallback(async (forceRefresh = false) => {
    if (!userId) return;
    setCommentsLoading(true);
    try {
      if (!forceRefresh) {
        const cached = await getCachedComments<any[]>(userId);
        if (cached) {
          if (mountedRef.current) { setMyComments(cached); setCommentsLoading(false); }
          return;
        }
      }
      const list = await getUserComments(userId);
      setCachedComments<any[]>(userId, list).catch(() => {});
      if (mountedRef.current) setMyComments(list);
    } catch {}
    if (mountedRef.current) setCommentsLoading(false);
  }, [userId]);

  const loadMyHistory = useCallback(async () => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const stored = await AsyncStorage.getItem(`local_scan_history_${userId}`);
      const local: any[] = stored
        ? JSON.parse(stored).map((s: any) => ({ ...s, source: "local" as const }))
        : [];

      // FIX (100-item hard cap): paginate through all cloud scans instead of
      // truncating at 100. Each page is 500 items; most users will finish in
      // one round-trip. The loop stops when Firestore signals no more pages.
      const allCloudItems: any[] = [];
      let cursor: any = undefined;
      let hasMore = true;
      while (hasMore) {
        const { items, cursor: nextCursor, hasMore: more } =
          await getUserScansPaginated(userId, 500, cursor);
        allCloudItems.push(...items);
        cursor = nextCursor;
        hasMore = more && !!nextCursor;
      }
      const cloud = allCloudItems.map((s: any) => ({ ...s, source: "cloud" as const }));

      // FIX (dedup key): previously only deduped by qrCodeId, so offline scans
      // (which have no qrCodeId) were never checked against cloud scans and
      // could appear twice. Now falls back to a source-prefixed id key.
      const merged = [...local];
      const seenKeys = new Set<string>(
        local.map((i) => i.qrCodeId ? `qr:${i.qrCodeId}` : `local:${i.id}`)
      );
      for (const c of cloud) {
        const key = c.qrCodeId ? `qr:${c.qrCodeId}` : `cloud:${c.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          merged.push(c);
        }
      }
      merged.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
      if (mountedRef.current) setMyHistory(merged);
    } catch {}
    if (mountedRef.current) setHistoryLoading(false);
  }, [userId]);

  const handleDeleteComment = useCallback(async (commentId: string, qrCodeId: string) => {
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          setMyComments((prev) => {
            const next = prev.filter((c) => c.id !== commentId);
            if (userId) setCachedComments<any[]>(userId, next).catch(() => {});
            return next;
          });
          try {
            if (userId) await softDeleteComment(qrCodeId, commentId, userId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Could not delete comment.");
          }
        },
      },
    ]);
  }, [userId]);

  const handleDeleteAllComments = useCallback(async () => {
    Alert.alert(
      "Delete All Comments",
      "This will permanently delete all your comments. Under Indian DPDP Act and GDPR, your data will be removed within 7 days. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All", style: "destructive",
          onPress: async () => {
            const snapshot = myCommentsRef.current;
            setMyComments([]);
            if (userId) setCachedComments<any[]>(userId, []).catch(() => {});
            try {
              if (userId) await deleteAllUserComments(userId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              setMyComments(snapshot);
              if (userId) setCachedComments<any[]>(userId, snapshot).catch(() => {});
              Alert.alert("Error", "Could not delete all comments.");
            }
          },
        },
      ]
    );
  }, [userId]);

  const handleDeleteHistoryItem = useCallback(async (item: any) => {
    setMyHistory((prev) => prev.filter((h) => h.id !== item.id));
    try {
      if (userId) {
        if (item.source === "cloud") {
          await deleteUserScan(userId, item.id);
        } else {
          const stored = await AsyncStorage.getItem(`local_scan_history_${userId}`);
          if (stored) {
            const arr = JSON.parse(stored).filter((s: any) => s.id !== item.id);
            await AsyncStorage.setItem(`local_scan_history_${userId}`, JSON.stringify(arr));
          }
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMyHistory((prev) =>
        [item, ...prev].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      );
    }
  }, [userId]);

  const handleDeleteAllHistory = useCallback(async () => {
    Alert.alert(
      "Delete All History",
      "This will remove all your scan history from this device and the cloud. Security data is anonymised and retained for threat analysis under our privacy policy. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All", style: "destructive",
          onPress: async () => {
            // FIX (rollback closure): same pattern as comments — use the live
            // ref so the rollback is always accurate regardless of when this
            // callback was last re-created by useCallback.
            const snapshot = myHistoryRef.current;
            setMyHistory([]);
            try {
              if (userId) {
                await AsyncStorage.removeItem(`local_scan_history_${userId}`);
                await deleteAllUserScans(userId);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              setMyHistory(snapshot);
              Alert.alert("Error", "Could not delete history.");
            }
          },
        },
      ]
    );
  }, [userId]);

  return {
    followingList, followingLoading, loadFollowing,
    myComments, commentsLoading, loadMyComments,
    myHistory, historyLoading, loadMyHistory,
    resetData,
    handleDeleteComment,
    handleDeleteAllComments,
    handleDeleteHistoryItem,
    handleDeleteAllHistory,
  };
}
