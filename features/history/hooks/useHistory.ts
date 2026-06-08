import { useState, useCallback } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/shared/utils/haptics";
import { deleteUserScan } from "@/lib/firestore-service";
import { invalidateHistoryCache, invalidateHomeScansCache } from "@/services/cache/qr-cache";
import { useHistoryData } from "@/features/history/hooks/useHistoryData";
import { toggleFilter } from "@/features/history/utils/filter-utils";
import type { HistoryItem, FilterKey, ActiveFilters } from "@/features/history/types";

export type { HistoryItem, FilterKey, ActiveFilters };
export type { RiskLevel } from "@/features/history/types";

export function useHistory() {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(["all"]);

  const handleFilterChange = useCallback((key: FilterKey) => {
    setActiveFilters((prev) => toggleFilter(prev, key));
  }, []);

  const data = useHistoryData(activeFilters);
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
        setLocalHistory((prev) =>
          [...prev, item].sort((a, b) =>
            new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
          )
        );
      }
    } else {
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
        // Invalidate stats so badge counts update
        queryClient.invalidateQueries({ queryKey: ["scan-stats", user?.id] });
        // Mark the history + home queries stale (refetchType:'none' = don't
        // trigger an immediate background fetch, just let the next mount/focus
        // refetch naturally). The optimistic removal above already gives instant
        // visual feedback; this ensures the next load is always authoritative.
        queryClient.invalidateQueries({ queryKey: cloudKey,          refetchType: "none" });
        queryClient.invalidateQueries({ queryKey: favKey,            refetchType: "none" });
        queryClient.invalidateQueries({ queryKey: ["home-recent-scans", user?.id], refetchType: "none" });
        // Bust disk caches so the pre-warm on next launch doesn't re-seed stale data
        if (user?.id) {
          invalidateHistoryCache(user.id);
          invalidateHomeScansCache(user.id);
        }
      } catch {
        queryClient.setQueryData(cloudKey, prevCloud);
        queryClient.setQueryData(favKey, prevFavs);
      }
    }
  }, [user?.id, queryClient, setLocalHistory]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) invalidateHistoryCache(user.id);
    await loadLocalHistory(user?.id ?? null);
    if (user?.id) {
      await Promise.all([refetchCloud(), refetchFavorites(), refetchStats()]);
    }
    setRefreshing(false);
  }, [user?.id, loadLocalHistory, refetchCloud, refetchFavorites, refetchStats, setRefreshing]);

  // ── Load next page ─────────────────────────────────────────────────────────
  const handleEndReached = useCallback(() => {
    const isFav = activeFilters.length === 1 && activeFilters[0] === "favorites";
    if (!isFav && cloudHasMore && !loadingMore) fetchNextPage();
  }, [activeFilters, cloudHasMore, loadingMore, fetchNextPage]);

  // ── Clear local history ────────────────────────────────────────────────────
  async function clearLocalHistory() {
    Alert.alert(
      "Clear History",
      "This will remove all locally stored scan history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
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
    activeFilters,
    setActiveFilters,
    onFilterChange: handleFilterChange,
    deleteItem,
    onRefresh,
    handleEndReached,
    clearLocalHistory,
  };
}
