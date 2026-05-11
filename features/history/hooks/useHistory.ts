import { useCallback, useEffect, useState, useMemo } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/lib/haptics";
import { useFocusEffect } from "expo-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserScansPaginated,
  getUserFavorites,
  deleteUserScan,
  getUserScanStats,
  type ScanStatsResult,
} from "@/lib/firestore-service";
import { parseAnyPaymentQr, analyzeAnyPaymentQr, analyzeUrlHeuristics } from "@/lib/qr-analysis";
import { queryClient as globalQueryClient } from "@/lib/query-client";
import {
  getCachedHistoryPage,
  setCachedHistoryPage,
  getCachedFavorites,
  setCachedFavorites,
  getCachedScanStats,
  setCachedScanStats,
  invalidateHistoryCache,
} from "@/lib/cache/qr-cache";

export interface HistoryItem {
  id: string;
  content: string;
  contentType: string;
  scannedAt: string;
  qrCodeId?: string;
  source: "local" | "cloud" | "favorite";
  scanSource?: "camera" | "gallery" | "viewed";
}

export type Filter = "all" | "url" | "text" | "payment" | "other" | "favorites" | "camera" | "gallery";
export type RiskLevel = "safe" | "caution" | "dangerous";

const PAGE_SIZE = 20;
const STALE_MS = 15 * 60 * 1000;

function mapScanItem(s: any): HistoryItem {
  return {
    id: s.id,
    content: s.content,
    contentType: s.contentType,
    scannedAt: s.scannedAt,
    qrCodeId: s.qrCodeId,
    source: "cloud" as const,
    scanSource: (s.scanSource as "camera" | "gallery" | "viewed") || "camera",
  };
}

export function useHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  // ── Disk pre-warm: seed React Query caches from disk before any network call.
  //    All three caches (history page 1, favorites, stats) are pre-populated
  //    so the screen shows real data instantly on cold launch — zero Firestore
  //    reads needed until the 15-min stale window expires. ──────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;

    // History page 1 → infinite query cache
    getCachedHistoryPage<{ items: any[]; hasMore: boolean }>(uid).then((cached) => {
      if (!cached?.items?.length) return;
      const qk = ["history", uid];
      if (!globalQueryClient.getQueryData(qk)) {
        globalQueryClient.setQueryData(qk, {
          pages: [{ items: cached.items, cursor: null, hasMore: cached.hasMore }],
          pageParams: [null],
        });
      }
    }).catch(() => {});

    // Favorites → regular query cache
    getCachedFavorites<any[]>(uid).then((cached) => {
      if (!cached?.length) return;
      const qk = ["favorites", uid];
      if (!globalQueryClient.getQueryData(qk)) {
        globalQueryClient.setQueryData(qk, cached);
      }
    }).catch(() => {});

    // Scan stats → regular query cache
    getCachedScanStats<ScanStatsResult>(uid).then((cached) => {
      if (!cached) return;
      const qk = ["scan-stats", uid];
      if (!globalQueryClient.getQueryData(qk)) {
        globalQueryClient.setQueryData(qk, cached);
      }
    }).catch(() => {});
  }, [user?.id]);

  // ── Cloud history: paginated with React Query (15 min stale, 1 hr cache).
  //    First page is persisted to disk after each successful fetch so the
  //    next cold launch pre-warms from disk instead of hitting Firestore. ────────
  const {
    data: cloudData,
    fetchNextPage,
    hasNextPage: cloudHasMore,
    isFetchingNextPage: loadingMore,
    isLoading: cloudLoading,
    isError: cloudError,
    refetch: refetchCloud,
  } = useInfiniteQuery({
    queryKey: ["history", user?.id],
    queryFn: async ({ pageParam }) => {
      const result = await getUserScansPaginated(user!.id, PAGE_SIZE, pageParam ?? undefined);
      // Persist first page so cold launch can pre-warm from disk
      if (!pageParam) {
        setCachedHistoryPage(user!.id, {
          items: result.items,
          hasMore: result.hasMore,
        }).catch(() => {});
      }
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.cursor ?? null,
    initialPageParam: null,
    staleTime: STALE_MS,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!user?.id,
  });

  // ── Favorites: React Query (15 min stale, 1 hr cache) ────────────────────────
  const { data: favoritesRaw, refetch: refetchFavorites } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const data = await getUserFavorites(user!.id);
      setCachedFavorites(user!.id, data).catch(() => {});
      return data;
    },
    staleTime: STALE_MS,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!user?.id,
  });

  // ── Scan stats: React Query (15 min stale, 1 hr cache) ───────────────────────
  const { data: scanStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ScanStatsResult>({
    queryKey: ["scan-stats", user?.id],
    queryFn: async () => {
      const stats = await getUserScanStats(user!.id);
      setCachedScanStats(user!.id, stats).catch(() => {});
      return stats;
    },
    staleTime: STALE_MS,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!user?.id,
  });

  const cloudHistory = useMemo<HistoryItem[]>(
    () => (cloudData?.pages ?? []).flatMap((page) => page.items.map(mapScanItem)),
    [cloudData]
  );

  const favorites = useMemo<HistoryItem[]>(
    () =>
      (favoritesRaw ?? []).map((f: any) => ({
        id: f.id,
        content: f.content || f.qrCodeId,
        contentType: f.contentType || "text",
        scannedAt: f.createdAt,
        qrCodeId: f.qrCodeId,
        source: "favorite" as const,
      })),
    [favoritesRaw]
  );

  const history = useMemo<HistoryItem[]>(() => {
    const merged: HistoryItem[] = [...localHistory];
    for (const c of cloudHistory) {
      if (!merged.find((i) => i.qrCodeId && i.qrCodeId === c.qrCodeId)) {
        merged.push(c);
      }
    }
    return merged.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
  }, [localHistory, cloudHistory]);

  const safetyRiskMap = useMemo<Map<string, RiskLevel>>(() => {
    const map = new Map<string, RiskLevel>();
    for (const item of [...history, ...favorites]) {
      if (item.contentType === "url") {
        try { map.set(item.id, analyzeUrlHeuristics(item.content).riskLevel as RiskLevel); }
        catch { map.set(item.id, "safe"); }
      } else if (item.contentType === "payment") {
        try {
          const parsed = parseAnyPaymentQr(item.content);
          map.set(item.id, parsed ? analyzeAnyPaymentQr(parsed).riskLevel as RiskLevel : "safe");
        } catch { map.set(item.id, "safe"); }
      } else {
        map.set(item.id, "safe");
      }
    }
    return map;
  }, [history, favorites]);

  const displayItems = useMemo<HistoryItem[]>(() => {
    if (filter === "favorites") return favorites;
    return history.filter((item) => {
      if (filter === "all") return true;
      if (filter === "url") return item.contentType === "url";
      if (filter === "text") return item.contentType === "text";
      if (filter === "payment") return item.contentType === "payment";
      if (filter === "camera") return (item.scanSource ?? "camera") === "camera";
      if (filter === "gallery") return item.scanSource === "gallery";
      return !["url", "text", "payment"].includes(item.contentType);
    });
  }, [filter, history, favorites]);

  const loadLocalHistory = useCallback(async (userId?: string | null) => {
    try {
      if (!userId) { setLocalHistory([]); return; }
      const stored = await AsyncStorage.getItem(`local_scan_history_${userId}`);
      if (stored) {
        const local: any[] = JSON.parse(stored);
        setLocalHistory(local.map((s) => ({ ...s, source: "local" as const, scanSource: s.scanSource || "camera" })));
      } else {
        setLocalHistory([]);
      }
    } catch { setLocalHistory([]); }
  }, []);

  // Load local history on user change
  useEffect(() => {
    loadLocalHistory(user?.id ?? null);
  }, [user?.id, loadLocalHistory]);

  // Focus-based refetch: only when data is stale (older than STALE_MS)
  useFocusEffect(
    useCallback(() => {
      loadLocalHistory(user?.id ?? null);
      if (!user?.id) return;
      const now = Date.now();
      const cloudState = queryClient.getQueryState(["history", user.id]);
      if (!cloudState?.dataUpdatedAt || now - cloudState.dataUpdatedAt > STALE_MS) {
        refetchCloud();
      }
      const favState = queryClient.getQueryState(["favorites", user.id]);
      if (!favState?.dataUpdatedAt || now - favState.dataUpdatedAt > STALE_MS) {
        refetchFavorites();
      }
      const statsState = queryClient.getQueryState(["scan-stats", user.id]);
      if (!statsState?.dataUpdatedAt || now - statsState.dataUpdatedAt > STALE_MS) {
        refetchStats();
      }
    }, [user?.id, loadLocalHistory, queryClient, refetchCloud, refetchFavorites, refetchStats])
  );

  // Pull-to-refresh: bust all disk caches then re-fetch everything fresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) invalidateHistoryCache(user.id);
    await loadLocalHistory(user?.id ?? null);
    if (user?.id) {
      await Promise.all([refetchCloud(), refetchFavorites(), refetchStats()]);
    }
    setRefreshing(false);
  }, [user?.id, loadLocalHistory, refetchCloud, refetchFavorites, refetchStats]);

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
          [...prev, item].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
        );
      }
    } else {
      // Optimistic remove from cloud history cache
      const cloudKey = ["history", user?.id];
      const favKey = ["favorites", user?.id];
      const prevCloud = queryClient.getQueryData(cloudKey);
      const prevFavs = queryClient.getQueryData(favKey);

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
        // Invalidate stats so total count updates
        queryClient.invalidateQueries({ queryKey: ["scan-stats", user?.id] });
      } catch {
        queryClient.setQueryData(cloudKey, prevCloud);
        queryClient.setQueryData(favKey, prevFavs);
      }
    }
  }, [user?.id, queryClient]);

  const handleEndReached = useCallback(() => {
    if (filter !== "favorites" && cloudHasMore && !loadingMore) {
      fetchNextPage();
    }
  }, [filter, cloudHasMore, loadingMore, fetchNextPage]);

  async function clearLocalHistory() {
    Alert.alert("Clear History", "This will remove all locally stored scan history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear", style: "destructive", onPress: async () => {
          if (user?.id) await AsyncStorage.removeItem(`local_scan_history_${user.id}`);
          setLocalHistory([]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  return {
    user,
    history,
    displayItems,
    safetyRiskMap,
    filter,
    setFilter,
    refreshing,
    loadingMore,
    cloudLoading,
    cloudError: cloudError as boolean,
    cloudHasMore: cloudHasMore ?? false,
    onRefresh,
    handleEndReached,
    clearLocalHistory,
    loadMoreCloudHistory: fetchNextPage,
    deleteItem,
    scanStats: scanStats ?? null,
    statsLoading,
    allStatsItems: [] as Array<{ id: string; content: string; contentType: string }>,
  };
}
