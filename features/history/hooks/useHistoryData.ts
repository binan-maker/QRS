import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/shared/contexts/AuthContext";
import { getUserScansPaginated, syncLocalScansToCloud } from "@/lib/data-service";
import { isWebSupabaseConfigured } from "@/lib/core/supabase";
import { queryClient as globalQueryClient } from "@/lib/core/query-client";
import { mergeAndDeduplicateScans } from "@/services/scan-history/dedup";
import {
  getCachedHistoryPage,
  setCachedHistoryPage,
} from "@/services/cache/qr-cache";
import type { HistoryItem } from "@/features/history/types";
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

export function useHistoryData() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient   = useQueryClient();
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [localLoaded,  setLocalLoaded]  = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  // ── Disk pre-warm ────────────────────────────────────────────────────────────
  const preWarmUid = useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.id ?? null;
    if (!uid || preWarmUid.current === uid) return;
    preWarmUid.current = uid;

    getCachedHistoryPage<{ items: any[]; hasMore: boolean }>(uid)
      .then((cachedHistory) => {
        const qkHistory = ["history", uid];
        if (cachedHistory?.items?.length && !globalQueryClient.getQueryData(qkHistory)) {
          globalQueryClient.setQueryData(qkHistory, {
            pages:      [{ items: cachedHistory.items, cursor: null, hasMore: cachedHistory.hasMore }],
            pageParams: [null],
          });
          globalQueryClient.invalidateQueries({ queryKey: qkHistory, refetchType: "active" });
        }
      })
      .catch(() => {});
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
      if (!pageParam && result?.items && result.items.length > 0) {
        setCachedHistoryPage(user!.id, { items: result.items, hasMore: !!result.hasMore }).catch(() => {});
      }
      return result || { items: [], cursor: null, hasMore: false };
    },
    getNextPageParam: (lastPage) => lastPage?.cursor ?? null,
    initialPageParam: null,
    staleTime:        STALE_MS,
    gcTime:           60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount:   true,
    enabled:          !!user?.id && !authLoading,
  });

  // ── Derived collections ──────────────────────────────────────────────────────
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

  const displayItems = history;

  // ── Local history loading ────────────────────────────────────────────────────
  const localLoadTimestampRef = useRef<number>(0);

  const loadLocalHistory = useCallback(async (userId?: string | null) => {
    localLoadTimestampRef.current = Date.now();
    try {
      const keysToTry = [
        userId ? `local_scan_history_${userId}` : null,
        "local_scan_history",
      ].filter(Boolean) as string[];

      const combined: HistoryItem[] = [];
      const seen = new Set<string>();

      for (const key of keysToTry) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const list: any[] = JSON.parse(stored);
          if (Array.isArray(list)) {
            for (const item of list) {
              if (item.isDeleted === true || item.is_deleted === true) continue;
              const qrId = item.qrCodeId || item.qrId || item.id;
              const content = item.content || item.rawContent || "";
              const dedupKey = qrId ? `qr:${qrId}` : `c:${content}`;
              if (seen.has(dedupKey)) continue;
              seen.add(dedupKey);

              combined.push({
                id: String(item.id || qrId || Date.now()),
                content,
                contentType: item.contentType || item.content_type || "url",
                scannedAt: item.scannedAt || item.scanned_at || new Date().toISOString(),
                qrCodeId: qrId,
                source: "local" as const,
              });
            }
          }
        }
      }

      setLocalHistory(combined);

      // If user is logged in and found scans in fallback keys, persist to user's local key
      if (userId && combined.length > 0) {
        AsyncStorage.setItem(`local_scan_history_${userId}`, JSON.stringify(combined)).catch(() => {});
      }
    } catch {
      setLocalHistory([]);
    }
    setLocalLoaded(true);
  }, []);

  useEffect(() => {
    loadLocalHistory(user?.id ?? null);
    if (user?.id && !authLoading) {
      refetchCloud();
      syncLocalScansToCloud(user.id).catch(() => {});
    }
  }, [user?.id, authLoading, loadLocalHistory, refetchCloud]);

  // ── Focus-based refetch ──────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (Date.now() - localLoadTimestampRef.current > 500) {
        loadLocalHistory(user?.id ?? null);
      }
      if (user?.id && !authLoading) {
        refetchCloud();
        syncLocalScansToCloud(user.id).catch(() => {});
      }
    }, [user?.id, authLoading, loadLocalHistory, refetchCloud])
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
    cloudError:     isWebSupabaseConfigured() ? (cloudError as boolean) : false,
    fetchNextPage,
    refetchCloud,
    history,
    displayItems,
    refreshing,
    setRefreshing,
    bootstrapping: !localLoaded,
  };
}
