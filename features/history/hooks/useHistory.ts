import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/shared/utils/haptics";
import { deleteUserScan } from "@/lib/data-service";
import { invalidateHistoryCache, invalidateHomeScansCache } from "@/services/cache/qr-cache";
import { normalizeScanContent } from "@/services/scan-history/dedup";
import { useHistoryData } from "@/features/history/hooks/useHistoryData";
import type { HistoryItem } from "@/features/history/types";

export type { HistoryItem };

export function useHistory() {
  const data = useHistoryData();
  const {
    user,
    queryClient,
    setLocalHistory,
    loadLocalHistory,
    cloudHasMore,
    loadingMore,
    fetchNextPage,
    refetchCloud,
    setRefreshing,
  } = data;

  // ── Delete a scan item ─────────────────────────────────────────────────────
  const deleteItem = useCallback(async (item: HistoryItem) => {
    const targetQrId = item.qrCodeId;
    const targetNormContent = item.content ? normalizeScanContent(item.content) : null;

    const isMatch = (s: any) => {
      if (s.id === item.id) return true;
      if (targetQrId && s.qrCodeId === targetQrId) return true;
      if (targetNormContent && s.content && normalizeScanContent(s.content) === targetNormContent) return true;
      return false;
    };

    if (item.source === "local") {
      setLocalHistory((prev) => prev.filter((i) => !isMatch(i)));
      try {
        if (user?.id) {
          const stored = await AsyncStorage.getItem(`local_scan_history_${user.id}`);
          if (stored) {
            const arr = JSON.parse(stored).filter((s: any) => !isMatch(s));
            await AsyncStorage.setItem(`local_scan_history_${user.id}`, JSON.stringify(arr));
          }
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        setLocalHistory((prev) =>
          [...prev, item].sort((a, b) =>
            new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
          )
        );
      }
    } else {
      const cloudKey = ["history", user?.id];
      const prevCloud = queryClient.getQueryData(cloudKey);

      queryClient.setQueryData(cloudKey, (old: any) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                items: page.items.filter((i: any) => !isMatch(i)),
              })),
            }
          : old
      );
      try {
        if (user?.id) await deleteUserScan(user.id, item.id, targetQrId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: cloudKey,          refetchType: "none" });
        queryClient.invalidateQueries({ queryKey: ["home-recent-scans", user?.id], refetchType: "none" });
        // Bust disk caches so the pre-warm on next launch doesn't re-seed stale data
        if (user?.id) {
          invalidateHistoryCache(user.id);
          invalidateHomeScansCache(user.id);
        }
      } catch {
        queryClient.setQueryData(cloudKey, prevCloud);
      }
    }
  }, [user?.id, queryClient, setLocalHistory]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.id) invalidateHistoryCache(user.id);
      await loadLocalHistory(user?.id ?? null);
      if (user?.id) {
        await refetchCloud().catch(() => {});
      }
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, loadLocalHistory, refetchCloud, setRefreshing]);

  // ── Load next page ─────────────────────────────────────────────────────────
  const handleEndReached = useCallback(() => {
    // Guard: user may have signed out mid-scroll; skip if no active session.
    if (!user?.id) return;
    if (cloudHasMore && !loadingMore) fetchNextPage();
  }, [user?.id, cloudHasMore, loadingMore, fetchNextPage]);

  return {
    ...data,
    deleteItem,
    onRefresh,
    handleEndReached,
  };
}
