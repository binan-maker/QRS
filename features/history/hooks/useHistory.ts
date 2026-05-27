// ─── useHistory (orchestrator) ────────────────────────────────────────────────
// Composes useHistoryData with mutation/action logic: delete, refresh, clear,
// and pagination end-reached. Exports the complete API consumed by HistoryScreen.

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/shared/utils/haptics";
import { deleteUserScan } from "@/lib/firestore-service";
import { invalidateHistoryCache } from "@/services/cache/qr-cache";
import { useHistoryData } from "@/features/history/hooks/useHistoryData";
import type { HistoryItem, Filter } from "@/features/history/types";

// Re-export types so importers don't need to know about the split
export type { HistoryItem, Filter };
export type { RiskLevel } from "@/features/history/types";

export function useHistory() {
  const [filter, setFilter] = useState<Filter>("all");

  const data = useHistoryData(filter);
  const {
    user,
    queryClient,
    setLocalHistory,
    loadLocalHistory,
    cloudHasMore,
    loadingMore,
    fetchNextPage,
    refetchCloud,
    refetchFavorites,
    refetchStats,
    setRefreshing,
  } = data;

  // ── Delete a scan item ─────────────────────────────────────────────────────
  const deleteItem = useCallback(async (item: HistoryItem) => {
    if (item.source === "local") {
      setLocalHistory((prev) => prev.filter((i) => i.id !== item.id));
      try {
        if (user?.id) {
          const stored = await AsyncStorage.getItem(`local_scan_history_${user.id}`);
          if (stored) {
            const arr = JSON.parse(stored).filter((s: any) => s.id !== item.id);
            await AsyncStorage.setItem(`local_scan_history_${user.id}`, JSON.stringify(arr));
          }
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Roll back optimistic remove
        setLocalHistory((prev) =>
          [...prev, item].sort((a, b) =>
            new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
          )
        );
      }
    } else {
      // Optimistic remove from React Query cache
      const cloudKey = ["history", user?.id];
      const favKey   = ["favorites", user?.id];
      const prevCloud = queryClient.getQueryData(cloudKey);
      const prevFavs  = queryClient.getQueryData(favKey);

      queryClient.setQueryData(cloudKey, (old: any) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                items: page.items.filter((i: any) => i.id !== item.id),
              })),
            }
          : old
      );
      queryClient.setQueryData(favKey, (old: any[]) =>
        old ? old.filter((f: any) => f.id !== item.id) : old
      );

      try {
        if (user?.id) await deleteUserScan(user.id, item.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: ["scan-stats", user?.id] });
      } catch {
        queryClient.setQueryData(cloudKey, prevCloud);
        queryClient.setQueryData(favKey, prevFavs);
      }
    }
  }, [user?.id, queryClient, setLocalHistory]);

  // ── Pull-to-refresh: bust disk caches then re-fetch everything ─────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) invalidateHistoryCache(user.id);
    await loadLocalHistory(user?.id ?? null);
    if (user?.id) {
      await Promise.all([refetchCloud(), refetchFavorites(), refetchStats()]);
    }
    setRefreshing(false);
  }, [user?.id, loadLocalHistory, refetchCloud, refetchFavorites, refetchStats, setRefreshing]);

  // ── Load next page when list reaches the end ───────────────────────────────
  const handleEndReached = useCallback(() => {
    if (filter !== "favorites" && cloudHasMore && !loadingMore) fetchNextPage();
  }, [filter, cloudHasMore, loadingMore, fetchNextPage]);

  // ── Clear all locally stored history ──────────────────────────────────────
  async function clearLocalHistory() {
    Alert.alert(
      "Clear History",
      "This will remove all locally stored scan history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear", style: "destructive",
          onPress: async () => {
            if (user?.id) await AsyncStorage.removeItem(`local_scan_history_${user.id}`);
            setLocalHistory([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  return {
    ...data,
    filter,
    setFilter,
    deleteItem,
    onRefresh,
    handleEndReached,
    clearLocalHistory,
    allStatsItems: [] as Array<{ id: string; content: string; contentType: string }>,
  };
}
