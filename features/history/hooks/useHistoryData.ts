import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  getUserScansPaginated,
  getUserFavorites,
  getUserScanStats,
  type ScanStatsResult,
} from "@/lib/firestore-service";
import { parseAnyPaymentQr, analyzeAnyPaymentQr, analyzeUrlHeuristics } from "@/services/analysis";
import { queryClient as globalQueryClient } from "@/shared/utils/query-client";
import {
  getCachedHistoryPage,
  setCachedHistoryPage,
  getCachedFavorites,
  setCachedFavorites,
  getCachedScanStats,
  setCachedScanStats,
} from "@/services/cache/qr-cache";
import type { HistoryItem, RiskLevel, ActiveFilters } from "@/features/history/types";
import { itemMatchesFilters } from "@/features/history/utils/filter-utils";
import { PAGE_SIZE, STALE_MS } from "@/features/history/utils/constants";

function mapScanItem(s: any): HistoryItem {
  return {
    id:          s.id,
    content:     s.content,
    contentType: s.contentType,
    scannedAt:   s.scannedAt,
    qrCodeId:    s.qrCodeId,
    source:      "cloud" as const,
    scanSource:  (s.scanSource as "camera" | "gallery" | "viewed") || "camera",
  };
}

export function useHistoryData(activeFilters: ActiveFilters) {
  const { user }      = useAuth();
  const queryClient   = useQueryClient();
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [refreshing,   setRefreshing]   = useState(false);

  // ── Disk pre-warm ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;

    getCachedHistoryPage<{ items: any[]; hasMore: boolean }>(uid).then((cached) => {
      if (!cached?.items?.length) return;
      const qk = ["history", uid];
      if (!globalQueryClient.getQueryData(qk)) {
        globalQueryClient.setQueryData(qk, {
          pages:      [{ items: cached.items, cursor: null, hasMore: cached.hasMore }],
          pageParams: [null],
        });
      }
    }).catch(() => {});

    getCachedFavorites<any[]>(uid).then((cached) => {
      if (!cached?.length) return;
      const qk = ["favorites", uid];
      if (!globalQueryClient.getQueryData(qk)) globalQueryClient.setQueryData(qk, cached);
    }).catch(() => {});

    getCachedScanStats<ScanStatsResult>(uid).then((cached) => {
      if (!cached) return;
      const qk = ["scan-stats", uid];
      if (!globalQueryClient.getQueryData(qk)) globalQueryClient.setQueryData(qk, cached);
    }).catch(() => {});
  }, [user?.id]);

  // ── Cloud history: paginated ────────────────────────────────────────────────
  const {
    data:               cloudData,
    fetchNextPage,
    hasNextPage:        cloudHasMore,
    isFetchingNextPage: loadingMore,
    isLoading:          cloudLoading,
    isError:            cloudError,
    refetch:            refetchCloud,
  } = useInfiniteQuery({
    queryKey:        ["history", user?.id],
    queryFn:         async ({ pageParam }) => {
      const result = await getUserScansPaginated(user!.id, PAGE_SIZE, pageParam ?? undefined);
      if (!pageParam) {
        setCachedHistoryPage(user!.id, { items: result.items, hasMore: result.hasMore }).catch(() => {});
      }
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.cursor ?? null,
    initialPageParam: null,
    staleTime:        STALE_MS,
    gcTime:           60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount:   false,
    enabled:          !!user?.id,
  });

  // ── Favorites ───────────────────────────────────────────────────────────────
  const { data: favoritesRaw, refetch: refetchFavorites } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn:  async () => {
      const data = await getUserFavorites(user!.id);
      setCachedFavorites(user!.id, data).catch(() => {});
      return data;
    },
    staleTime:            STALE_MS,
    gcTime:               60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount:       false,
    enabled:              !!user?.id,
  });

  // ── Scan stats ──────────────────────────────────────────────────────────────
  const {
    data:      scanStats,
    isLoading: statsLoading,
    refetch:   refetchStats,
  } = useQuery<ScanStatsResult>({
    queryKey: ["scan-stats", user?.id],
    queryFn:  async () => {
      const stats = await getUserScanStats(user!.id);
      setCachedScanStats(user!.id, stats).catch(() => {});
      return stats;
    },
    staleTime:            STALE_MS,
    gcTime:               60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount:       false,
    enabled:              !!user?.id,
  });

  // ── Derived collections ─────────────────────────────────────────────────────
  const cloudHistory = useMemo<HistoryItem[]>(
    () => (cloudData?.pages ?? []).flatMap((page) => page.items.map(mapScanItem)),
    [cloudData]
  );

  const favorites = useMemo<HistoryItem[]>(
    () => (favoritesRaw ?? []).map((f: any) => ({
      id:          f.id,
      content:     f.content || f.qrCodeId,
      contentType: f.contentType || "text",
      scannedAt:   f.createdAt,
      qrCodeId:    f.qrCodeId,
      source:      "favorite" as const,
    })),
    [favoritesRaw]
  );

  const history = useMemo<HistoryItem[]>(() => {
    const merged: HistoryItem[] = [...localHistory];
    for (const c of cloudHistory) {
      if (!merged.find((i) => i.qrCodeId && i.qrCodeId === c.qrCodeId)) merged.push(c);
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
    // Favorites is always exclusive
    if (activeFilters.includes("favorites")) return favorites;

    // "all" (or empty) = show everything
    const contentFilters = activeFilters.filter((k) => k !== "all");
    if (contentFilters.length === 0) return history;

    return history.filter((item) =>
      itemMatchesFilters(item.contentType, contentFilters)
    );
  }, [activeFilters, history, favorites]);

  // ── Local history loading ───────────────────────────────────────────────────
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

  useEffect(() => {
    loadLocalHistory(user?.id ?? null);
  }, [user?.id, loadLocalHistory]);

  // ── Focus-based refetch: only when stale ────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadLocalHistory(user?.id ?? null);
      if (!user?.id) return;
      const now = Date.now();
      const cloudState = queryClient.getQueryState(["history", user.id]);
      if (!cloudState?.dataUpdatedAt || now - cloudState.dataUpdatedAt > STALE_MS) refetchCloud();
      const favState = queryClient.getQueryState(["favorites", user.id]);
      if (!favState?.dataUpdatedAt || now - favState.dataUpdatedAt > STALE_MS) refetchFavorites();
      const statsState = queryClient.getQueryState(["scan-stats", user.id]);
      if (!statsState?.dataUpdatedAt || now - statsState.dataUpdatedAt > STALE_MS) refetchStats();
    }, [user?.id, loadLocalHistory, queryClient, refetchCloud, refetchFavorites, refetchStats])
  );

  return {
    user,
    queryClient,
    localHistory,
    setLocalHistory,
    loadLocalHistory,
    cloudHasMore:   cloudHasMore ?? false,
    loadingMore,
    cloudLoading,
    cloudError:     cloudError as boolean,
    fetchNextPage,
    refetchCloud,
    favorites,
    refetchFavorites,
    scanStats:      scanStats ?? null,
    statsLoading,
    refetchStats,
    history,
    safetyRiskMap,
    displayItems,
    refreshing,
    setRefreshing,
  };
}
