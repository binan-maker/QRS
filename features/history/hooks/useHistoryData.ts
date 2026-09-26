import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  getUserScansPaginated,
  getUserScanStats,
  type ScanStatsResult,
} from "@/lib/data-service";
import { queryClient as globalQueryClient } from "@/lib/query-client";
import { mergeAndDeduplicateScans } from "@/services/scan-history/dedup";
import {
  getCachedHistoryPage,
  setCachedHistoryPage,
  getCachedScanStats,
  setCachedScanStats,
} from "@/services/cache/qr-cache";
import type { HistoryItem, ActiveFilters } from "@/features/history/types";
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
  // True when pre-warm found cached cloud history on disk — used to decide
  // whether to keep showing the skeleton until the live Firestore fetch
  // arrives.  Without this flag, the first render after pre-warm may show
  // only local items (2–3 cards) before the cloud items appear, making users
  // think their history was deleted.
  const [hadCachedCloud, setHadCachedCloud] = useState(false);
  const preWarmUid = useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.id ?? null;
    if (preWarmUid.current === uid) return;   // already warmed for this user
    preWarmUid.current = uid;

    // Reset the gate for the new user so Firestore queries wait for cache
    // seeding.  Without this reset, preWarmDone stays true from a previous
    // user (or the null/guest case) and queries start before cached data is
    // seeded, causing a loading flash instead of instant cached render.
    setPreWarmDone(false);

    if (!uid) { setPreWarmDone(true); return; }

    Promise.all([
      getCachedHistoryPage<{ items: any[]; hasMore: boolean }>(uid),
      getCachedScanStats<ScanStatsResult>(uid),
    ]).then(([cachedHistory, cachedStats]) => {
      // Seed history
      const qkHistory = ["history", uid];
      if (cachedHistory?.items?.length && !globalQueryClient.getQueryData(qkHistory)) {
        globalQueryClient.setQueryData(qkHistory, {
          pages:      [{ items: cachedHistory.items, cursor: null, hasMore: cachedHistory.hasMore }],
          pageParams: [null],
        });
        setHadCachedCloud(true);
        // Immediately mark stale so a background Firestore fetch always runs
        // behind the cached render.  Without this, setQueryData stamps
        // dataUpdatedAt=now and the staleTime window keeps data "fresh",
        // causing the focus-based refetch to skip — users see old data until
        // the full staleTime expires.
        globalQueryClient.invalidateQueries({ queryKey: qkHistory, refetchType: "active" });
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

  const historyHasData = (cloudData?.pages?.length ?? 0) > 0 || !cloudLoading;

  // ── Scan stats ───────────────────────────────────────────────────────────────
  // Deferred until after history has started.
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
  // Use an explicit double loop instead of flatMap → map to avoid creating
  // one intermediate array per page.  For 50+ pages this eliminates 50
  // short-lived array allocations and reduces GC pressure.
  const cloudHistory = useMemo<HistoryItem[]>(() => {
    const pages = cloudData?.pages;
    if (!pages?.length) return [];
    const result: HistoryItem[] = [];
    for (let p = 0; p < pages.length; p++) {
      const items = pages[p].items;
      for (let i = 0; i < items.length; i++) {
        result.push(mapScanItem(items[i]));
      }
    }
    return result;
  }, [cloudData]);

  // Same qrCodeId+minuteBucket dedup as home scans — algorithm in services/scan-history/dedup.ts.
  const history = useMemo<HistoryItem[]>(
    () => mergeAndDeduplicateScans(localHistory, cloudHistory),
    [localHistory, cloudHistory],
  );

  const displayItems = useMemo<HistoryItem[]>(() => {
    const contentFilters = activeFilters.filter((k) => k !== "all");
    if (contentFilters.length === 0) return history;
    return history.filter((item) => itemMatchesFilters(item.contentType, contentFilters));
  }, [activeFilters, history]);

  // ── Local history loading ────────────────────────────────────────────────────
  // localLoadTimestampRef prevents the double AsyncStorage read that happens
  // when both the mount useEffect and useFocusEffect fire on first render.
  // On subsequent tab-switches the timestamp will be stale (> 600 ms) so the
  // focus effect still reloads, picking up any scans written on other tabs.
  const localLoadTimestampRef = useRef<number>(0);

  const loadLocalHistory = useCallback(async (userId?: string | null) => {
    localLoadTimestampRef.current = Date.now();
    try {
      if (!userId) { setLocalHistory([]); setLocalLoaded(true); return; }
      const stored = await AsyncStorage.getItem(`local_scan_history_${userId}`);
      if (stored) {
        const local: any[] = JSON.parse(stored);
        setLocalHistory(local.map((s) => ({ ...s, source: "local" as const })));
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
      // Skip local reload if it was triggered very recently (< 600 ms) — this
      // prevents the double AsyncStorage read that occurs when the mount
      // useEffect and the first useFocusEffect both fire on screen mount.
      if (Date.now() - localLoadTimestampRef.current > 600) {
        loadLocalHistory(user?.id ?? null);
      }
      if (!user?.id || !preWarmDone) return;
      const now = Date.now();
      const cloudState = queryClient.getQueryState(["history", user.id]);
      if (!cloudState?.dataUpdatedAt || now - cloudState.dataUpdatedAt > STALE_MS) refetchCloud();
      const statsState = queryClient.getQueryState(["scan-stats", user.id]);
      if (!statsState?.dataUpdatedAt || now - statsState.dataUpdatedAt > STALE_MS) refetchStats();
    }, [user?.id, preWarmDone, loadLocalHistory, queryClient, refetchCloud, refetchStats])
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
    scanStats:      scanStats ?? null,
    statsLoading,
    refetchStats,
    history,
    displayItems,
    refreshing,
    setRefreshing,
    // Show skeleton only until local AsyncStorage is ready (~5 ms).
    // Pre-warm seeding happens in the background — no need to block the list
    // on those 3 extra disk reads; cloud data merges in silently once fetched.
    bootstrapping: !localLoaded,
  };
}
