import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/shared/contexts/AuthContext";
import { getUserGeneratedQrs, type GeneratedQrItem } from "@/lib/firestore-service";
import { readCache, writeCache } from "@/services/cache/local-cache";

const MY_QRS_CACHE_TTL = 5 * 60 * 1000;
export const PAGE_SIZE = 15;

export function qrsCacheKey(userId: string) { return `myqrs_v1_${userId}`; }

export type SortKey = "newest" | "oldest" | "mostScanned";

export const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "newest",      label: "Newest",      icon: "time-outline"        },
  { key: "mostScanned", label: "Top scanned", icon: "trending-up-outline" },
  { key: "oldest",      label: "Oldest",      icon: "hourglass-outline"   },
];

export function formatScanCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function useMyQrList() {
  const { user } = useAuth();

  const [qrCodes,      setQrCodes]      = useState<GeneratedQrItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [sortKey,      setSortKey]      = useState<SortKey>("newest");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const hasLoadedRef = useRef(false);

  const fetchQrCodes = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    if (!forceRefresh) {
      const cached = await readCache<GeneratedQrItem[]>(qrsCacheKey(user.id));
      if (cached) { setQrCodes(cached); setLoading(false); hasLoadedRef.current = true; return; }
    }
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const items = await getUserGeneratedQrs(user.id);
      setQrCodes(items);
      hasLoadedRef.current = true;
      writeCache(qrsCacheKey(user.id), items, MY_QRS_CACHE_TTL);
    } catch (e) {
      console.warn("[useMyQrList] fetchQrCodes error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (!user) return; fetchQrCodes(); }, [user?.id]);

  // On every focus, check cache freshness. readCache returns null when the
  // 5-min TTL has expired, so any expired or missing cache triggers a fresh fetch.
  // This ensures newly created QRs (which invalidate the cache in useQrSave) and
  // stale scan counts both surface when the user navigates back to this screen.
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      readCache<GeneratedQrItem[]>(qrsCacheKey(user.id)).then((cached) => {
        if (!cached) {
          fetchQrCodes(true);
        } else if (hasLoadedRef.current) {
          // Cache hit but user is returning — silently background-refresh
          // so scan counts stay up to date without blocking the UI.
          fetchQrCodes(false);
        }
      }).catch(() => {});
    }, [user?.id, fetchQrCodes])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQrCodes(true).finally(() => setRefreshing(false));
  }, [fetchQrCodes]);

  // Reset page window when sort or search changes
  useEffect(() => { setDisplayCount(PAGE_SIZE); }, [sortKey, searchQuery]);

  const sorted = useMemo(() => {
    let list = [...qrCodes];
    if (sortKey === "mostScanned") list.sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0));
    else if (sortKey === "oldest") list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      // Import lazily to avoid circular dep at module level
      const { getDisplayText } = require("../utils/qr-display");
      list = list.filter((item, idx) => {
        const displayText  = getDisplayText(item, idx).toLowerCase();
        const label        = (item.label || "").toLowerCase();
        const businessName = (item.businessName || "").toLowerCase();
        return displayText.includes(q) || label.includes(q) || businessName.includes(q);
      });
    }
    return list;
  }, [qrCodes, sortKey, searchQuery]);

  const paged = useMemo(() => sorted.slice(0, displayCount), [sorted, displayCount]);

  const handleLoadMore = useCallback(() => {
    if (displayCount < sorted.length) {
      setDisplayCount((c) => Math.min(c + PAGE_SIZE, sorted.length));
    }
  }, [displayCount, sorted.length]);

  return {
    user,
    qrCodes,
    loading,
    refreshing,
    sortKey,
    setSortKey,
    searchQuery,
    setSearchQuery,
    displayCount,
    setDisplayCount,
    sorted,
    paged,
    handleRefresh,
    handleLoadMore,
  };
}
