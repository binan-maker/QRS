import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [localLoaded,  setLocalLoaded]  = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  // ── Pre-warm gate ────────────────────────────────────────────────────────────
  // Seed the query cache from disk BEFORE enabling the Firestore queries so
  // the user sees cached data immediately rather than a blank skeleton.
  // All three caches are read in a single parallel Promise.all to keep the
  // gate window as short as possible (< 50 ms on device, < 1 ms on cache hit).
  const [preWarmDone, setPreWarmDone] = useState(false);
  const preWarmUid = useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.id ?? null;
    if (preWarmUid.current === uid) return;   // already warmed for this user
    preWarmUid.current = uid;

    if (!uid) { setPreWarmDone(true); return; }

    Promise.all([
      getCachedHistoryPage<{ items: any[]; hasMore: boolean }>(uid),
      getCachedFavorites<any[]>(uid),
      getCachedScanStats<ScanStatsResult>(uid),
    ]).then(([cachedHistory, cachedFavs, cachedStats]) => {
      // Seed history
      const qkHistory = ["history", uid];
      if (cachedHistory?.items?.length && !globalQueryClient.getQueryData(qkHistory)) {
        globalQueryClient.setQueryData(qkHistory, {
          pages:      [{ items: cachedHistory.items, cursor: null, hasMore: cachedHistory.hasMore }],
          pageParams: [null],
        });
      }
      // Seed favorites
      const qkFavs = ["favorites", uid];
      if (cachedFavs?.length && !globalQueryClient.getQueryData(qkFavs)) {
        globalQueryClient.setQueryData(qkFavs, cachedFavs);
      }
      // Seed stats
      const qkStats = ["scan-stats", uid];
      if (cachedStats && !globalQueryClient.getQueryData(qkStats)) {
        globalQueryClient.setQueryData(qkStats, cachedStats);
      }
    }).catch(() => {}).finally(() => setPreWarmDone(true));
  }, [user?.id]);

  // ── Cloud history: paginated ────────────────────────────────────────────────
  // Only starts after pre-warm so cached data is already in the query client.
  // This means returning users see their list instantly (no skeleton) while
  // Firestore refreshes silently in the background.
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
    refetchOnMount:   true,
    enabled:          !!user?.id && preWarmDone,
  });

  // ── Favorites ────────────────────────────────────────────────────────────────
  // Deferred: only starts after the history query is no longer in its initial
  // loading state. This avoids saturating the network on first mount.
  const historyHasData = (cloudData?.pages?.length ?? 0) > 0 || !cloudLoading;
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
    refetchOnMount:       true,
    enabled:              !!user?.id && preWarmDone && historyHasData,
  });

  // ── Scan stats ───────────────────────────────────────────────────────────────
  // Also deferred until after history + favorites have started.
  const { data: scanStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ScanStatsResult>({
    queryKey: ["scan-stats", user?.id],
    queryFn:  async () => {
      const stats = await getUserScanStats(user!.id);
      setCachedScanStats(user!.id, stats).catch(() => {});
      return stats;
    },
    staleTime:            STALE_MS,
    gcTime:               60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount:       true,
    enabled:              !!user?.id && preWarmDone && historyHasData,
  });

  // ── Derived collections ──────────────────────────────────────────────────────
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
    const combined = [...localHistory, ...cloudHistory];
    const seen     = new Set<string>();
    const unique: HistoryItem[] = [];

    for (const item of combined) {
      if (!item.qrCodeId) { unique.push(item); continue; }
      const minuteBucket = Math.floor(new Date(item.scannedAt).getTime() / 60_000);
      const key = `${item.qrCodeId}|${minuteBucket}`;
      if (!seen.has(key)) { seen.add(key); unique.push(item); }
    }

    return unique.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
  }, [localHistory, cloudHistory]);

  // ── Safety analysis — batched to avoid blocking the JS thread ───────────────
  // Items are processed in chunks of 25 with a yield between each batch so
  // the list stays responsive. The runId guard discards stale batches when
  // history/favorites change rapidly.
  const [safetyRiskMap, setSafetyRiskMap] = useState<Map<string, RiskLevel>>(new Map());
  const safetyRunIdRef = useRef(0);

  useEffect(() => {
    const runId = ++safetyRunIdRef.current;
    const allItems = [...history, ...favorites];
    if (allItems.length === 0) { setSafetyRiskMap(new Map()); return; }

    const BATCH = 25;
    const map = new Map<string, RiskLevel>();
    let idx = 0;

    function processNextBatch() {
      if (safetyRunIdRef.current !== runId) return;
      const end = Math.min(idx + BATCH, allItems.length);
      for (; idx < end; idx++) {
        const item = allItems[idx];
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
      if (idx >= allItems.length) {
        if (safetyRunIdRef.current === runId) setSafetyRiskMap(new Map(map));
      } else {
        // Yield to the renderer before the next batch
        setTimeout(processNextBatch, 0);
      }
    }

    // First yield lets the list paint before any analysis starts
    const timer = setTimeout(processNextBatch, 0);
    return () => { clearTimeout(timer); };
  }, [history, favorites]);

  const displayItems = useMemo<HistoryItem[]>(() => {
    if (activeFilters.includes("favorites")) return favorites;
    const contentFilters = activeFilters.filter((k) => k !== "all");
    if (contentFilters.length === 0) return history;
    return history.filter((item) => itemMatchesFilters(item.contentType, contentFilters));
  }, [activeFilters, history, favorites]);

  // ── Local history loading ────────────────────────────────────────────────────
  const loadLocalHistory = useCallback(async (userId?: string | null) => {
    try {
      if (!userId) { setLocalHistory([]); setLocalLoaded(true); return; }
      const stored = await AsyncStorage.getItem(`local_scan_history_${userId}`);
      if (stored) {
        const local: any[] = JSON.parse(stored);
        setLocalHistory(local.map((s) => ({ ...s, source: "local" as const, scanSource: s.scanSource || "camera" })));
      } else {
        setLocalHistory([]);
      }
    } catch { setLocalHistory([]); }
    setLocalLoaded(true);
  }, []);

  useEffect(() => {
    loadLocalHistory(user?.id ?? null);
  }, [user?.id, loadLocalHistory]);

  // ── Focus-based refetch: only when stale ─────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadLocalHistory(user?.id ?? null);
      if (!user?.id || !preWarmDone) return;
      const now = Date.now();
      const cloudState = queryClient.getQueryState(["history", user.id]);
      if (!cloudState?.dataUpdatedAt || now - cloudState.dataUpdatedAt > STALE_MS) refetchCloud();
      const favState = queryClient.getQueryState(["favorites", user.id]);
      if (!favState?.dataUpdatedAt || now - favState.dataUpdatedAt > STALE_MS) refetchFavorites();
      const statsState = queryClient.getQueryState(["scan-stats", user.id]);
      if (!statsState?.dataUpdatedAt || now - statsState.dataUpdatedAt > STALE_MS) refetchStats();
    }, [user?.id, preWarmDone, loadLocalHistory, queryClient, refetchCloud, refetchFavorites, refetchStats])
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
    // True until BOTH local scans have been read AND pre-warm has seeded the
    // cloud query cache. Prevents the flash of 2 local-only items before the
    // full list arrives (same fix as useRecentScans on the home screen).
    bootstrapping: !localLoaded || !preWarmDone,
  };
}
