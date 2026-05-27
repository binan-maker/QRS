import { useState, useCallback } from "react";
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

  const resetData = useCallback(() => {
    setFollowingList([]);
    setMyComments([]);
    setMyHistory([]);
  }, []);

  const loadFollowing = useCallback(async () => {
    if (!userId) return;
    setFollowingLoading(true);
    try {
      const list = await getUserFollowing(userId);
      setFollowingList(list);
    } catch {}
    setFollowingLoading(false);
  }, [userId]);

  const loadMyComments = useCallback(async () => {
    if (!userId) return;
    setCommentsLoading(true);
    try {
      const list = await getUserComments(userId);
      setMyComments(list);
    } catch {}
    setCommentsLoading(false);
  }, [userId]);

  const loadMyHistory = useCallback(async () => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const stored = await AsyncStorage.getItem(`local_scan_history_${userId}`);
      const local: any[] = stored
        ? JSON.parse(stored).map((s: any) => ({ ...s, source: "local" as const }))
        : [];
      const { items } = await getUserScansPaginated(userId, 100);
      const cloud = items.filter((s: any) => !s.isDeleted).map((s: any) => ({ ...s, source: "cloud" as const }));
      const merged = [...local];
      for (const c of cloud) {
        if (!merged.find((i) => i.qrCodeId && i.qrCodeId === c.qrCodeId)) merged.push(c);
      }
      merged.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
      setMyHistory(merged);
    } catch {}
    setHistoryLoading(false);
  }, [userId]);

  const handleDeleteComment = useCallback(async (commentId: string, qrCodeId: string) => {
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          setMyComments((prev) => prev.filter((c) => c.id !== commentId));
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
            const prev = [...myComments];
            setMyComments([]);
            try {
              if (userId) await deleteAllUserComments(userId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              setMyComments(prev);
              Alert.alert("Error", "Could not delete all comments.");
            }
          },
        },
      ]
    );
  }, [userId, myComments]);

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
            const prev = [...myHistory];
            setMyHistory([]);
            try {
              if (userId) {
                await AsyncStorage.removeItem(`local_scan_history_${userId}`);
                await deleteAllUserScans(userId);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              setMyHistory(prev);
              Alert.alert("Error", "Could not delete history.");
            }
          },
        },
      ]
    );
  }, [userId, myHistory]);

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
