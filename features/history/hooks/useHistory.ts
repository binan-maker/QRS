import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/lib/haptics";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { getUserScansPaginated, getUserFavorites, deleteUserScan, getUserScanStats, type ScanStatsResult } from "@/lib/firestore-service";
import { parseAnyPaymentQr, analyzeAnyPaymentQr, analyzeUrlHeuristics } from "@/lib/qr-analysis";

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

export function useHistory() {
  const { user } = useAuth();
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [cloudHistory, setCloudHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState(false);
  const [cloudHasMore, setCloudHasMore] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const cloudLastDocRef = useRef<any>(null);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  const [scanStats, setScanStats] = useState<ScanStatsResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const allStatsItems: Array<{ id: string; content: string; contentType: string }> = [];

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
    const allItems = [...history, ...favorites];
    for (const item of allItems) {
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

  const displayItems: HistoryItem[] = filter === "favorites"
    ? favorites
    : history.filter((item) => {
        if (filter === "all") return true;
        if (filter === "url") return item.contentType === "url";
        if (filter === "text") return item.contentType === "text";
        if (filter === "payment") return item.contentType === "payment";
        if (filter === "camera") return (item.scanSource ?? "camera") === "camera";
        if (filter === "gallery") return item.scanSource === "gallery";
        return !["url", "text", "payment"].includes(item.contentType);
      });

  const loadStats = useCallback(async (userId: string) => {
    setStatsLoading(true);
    try {
      const stats = await getUserScanStats(userId);
      setScanStats(stats);
    } catch {
      setScanStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

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

  const loadInitialCloudHistory = useCallback(async (userId: string, isRefreshing = false) => {
    if (!isRefreshing) setCloudLoading(true);
    setCloudError(false);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 1500));
        const result = await getUserScansPaginated(userId, PAGE_SIZE);
        cloudLastDocRef.current = result.cursor;
        setCloudHasMore(result.hasMore);
        setCloudHistory(result.items.map((s) => ({
          id: s.id, content: s.content, contentType: s.contentType,
          scannedAt: s.scannedAt, qrCodeId: s.qrCodeId, source: "cloud" as const,
          scanSource: (s.scanSource as "camera" | "gallery" | "viewed") || "camera",
        })));
        if (!isRefreshing) setCloudLoading(false);
        return;
      } catch (e: any) {
        console.warn(`[history] cloud fetch attempt ${attempt + 1}/3 failed: code=${e?.code} message=${e?.message} ${String(e)}`);
      }
    }
    if (!isRefreshing) {
      setCloudHistory([]);
      setCloudLoading(false);
    }
    setCloudError(true);
  }, []);

  const loadMoreCloudHistory = useCallback(async () => {
    if (!user || loadingMore || !cloudHasMore) return;
    setLoadingMore(true);
    try {
      const result = await getUserScansPaginated(user.id, PAGE_SIZE, cloudLastDocRef.current ?? undefined);
      cloudLastDocRef.current = result.cursor;
      setCloudHasMore(result.hasMore);
      setCloudHistory((prev) => [...prev, ...result.items.map((s) => ({
        id: s.id, content: s.content, contentType: s.contentType,
        scannedAt: s.scannedAt, qrCodeId: s.qrCodeId, source: "cloud" as const,
        scanSource: (s.scanSource as "camera" | "gallery" | "viewed") || "camera",
      }))]);
    } catch {}
    setLoadingMore(false);
  }, [user, loadingMore, cloudHasMore]);

  const loadFavorites = useCallback(async () => {
    if (!user) { setFavorites([]); return; }
    try {
      const favs = await getUserFavorites(user.id);
      setFavorites(favs.map((f: any) => ({
        id: f.id, content: f.content || f.qrCodeId, contentType: f.contentType || "text",
        scannedAt: f.createdAt, qrCodeId: f.qrCodeId, source: "favorite" as const,
      })));
    } catch {}
  }, [user]);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      setCloudHistory([]);
      setFavorites([]);
      setLocalHistory([]);
      setScanStats(null);
      cloudLastDocRef.current = null;
      setCloudHasMore(false);
    }
    loadLocalHistory(currentUserId);
    if (user) {
      loadInitialCloudHistory(user.id);
      loadFavorites();
      loadStats(user.id);
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCloudError(false);
    cloudLastDocRef.current = null;
    setCloudHasMore(false);
    await loadLocalHistory(user?.id);
    if (user) {
      await Promise.all([
        loadInitialCloudHistory(user.id, true),
        loadFavorites(),
        loadStats(user.id),
      ]);
    }
    setRefreshing(false);
  }, [user, loadLocalHistory, loadInitialCloudHistory, loadFavorites, loadStats]);

  async function clearLocalHistory() {
    Alert.alert("Clear History", "This will remove all locally stored scan history.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        if (user?.id) await AsyncStorage.removeItem(`local_scan_history_${user.id}`);
        setLocalHistory([]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }},
    ]);
  }

  async function deleteItem(item: HistoryItem) {
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
        setLocalHistory((prev) => [...prev, item].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()));
      }
    } else if (item.source === "cloud" || item.source === "favorite") {
      setCloudHistory((prev) => prev.filter((i) => i.id !== item.id));
      setFavorites((prev) => prev.filter((i) => i.id !== item.id));
      try {
        if (user?.id) await deleteUserScan(user.id, item.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        if (item.source === "cloud") setCloudHistory((prev) => [...prev, item].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()));
        else setFavorites((prev) => [...prev, item]);
      }
    }
  }

  const handleEndReached = useCallback(() => {
    if (filter !== "favorites") {
      loadMoreCloudHistory();
    }
  }, [filter, loadMoreCloudHistory]);

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
    cloudError,
    cloudHasMore,
    onRefresh,
    handleEndReached,
    clearLocalHistory,
    loadMoreCloudHistory,
    deleteItem,
    scanStats,
    statsLoading,
    allStatsItems,
  };
}
