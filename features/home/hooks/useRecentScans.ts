import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getUserScansPaginated } from "@/lib/firestore-service";
import { queryClient } from "@/lib/query-client";
import {
  getCachedHomeScans,
  setCachedHomeScans,
  invalidateHomeScansCache,
} from "@/services/cache/qr-cache";
import type { LocalScan } from "@/features/home/types";

const HOME_STALE_MS   = 5 * 60 * 1000;
const MAX_RECENT      = 5;
const homeQueryKey    = (uid: string) => ["home-recent-scans", uid] as const;
const localStorageKey = (uid: string) => `local_scan_history_${uid}`;

export function useRecentScans() {
  const { user } = useAuth();
  const [localScans,  setLocalScans]  = useState<LocalScan[]>([]);
  const [refreshing,  setRefreshing]  = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  // ── Disk pre-warm: seed the React Query cache from disk before the
  //    network call fires so the list appears instantly on cold launch.
  useEffect(() => {
    if (!user?.id) return;
    getCachedHomeScans<LocalScan[]>(user.id).then((cached) => {
      if (!cached || cached.length === 0) return;
      const qk = homeQueryKey(user.id);
      const existing = queryClient.getQueryData<LocalScan[]>(qk);
      if (!existing || existing.length === 0) queryClient.setQueryData(qk, cached);
    }).catch(() => {});
  }, [user?.id]);

  // ── Cloud scans: last MAX_RECENT from Firestore ───────────────────────────
  const {
    data:    cloudScansRaw,
    refetch: refetchCloud,
    isLoading: cloudLoading,
  } = useQuery<LocalScan[]>({
    queryKey: homeQueryKey(user?.id ?? ""),
    queryFn: async () => {
      const { items } = await getUserScansPaginated(user!.id, MAX_RECENT);
      const scans = items.map((s: any): LocalScan => ({
        id:          s.id,
        content:     s.content,
        contentType: s.contentType,
        scannedAt:   s.scannedAt,
        qrCodeId:    s.qrCodeId,
      }));
      setCachedHomeScans<LocalScan[]>(user!.id, scans).catch(() => {});
      return scans;
    },
    staleTime:           HOME_STALE_MS,
    gcTime:              30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount:      false,
    enabled:             !!user?.id,
    placeholderData:     [],
  });

  // ── Local scans from device AsyncStorage ──────────────────────────────────
  const loadLocalScans = useCallback(async (userId?: string | null) => {
    if (!userId) { setLocalScans([]); return; }
    try {
      const stored = await AsyncStorage.getItem(localStorageKey(userId));
      setLocalScans(stored ? JSON.parse(stored) : []);
    } catch {
      setLocalScans([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const currentUserId = user?.id ?? null;
      if (prevUserIdRef.current !== currentUserId) {
        prevUserIdRef.current = currentUserId;
        setLocalScans([]);
      }
      loadLocalScans(currentUserId);
    }, [user?.id, loadLocalScans])
  );

  // ── Merge local + cloud; deduplicate by qrCodeId; take MAX_RECENT ─────────
  const recentScans = useMemo<LocalScan[]>(() => {
    const cloud  = cloudScansRaw ?? [];
    const merged = [...localScans];
    for (const c of cloud) {
      if (!merged.find((l) => l.qrCodeId && l.qrCodeId === c.qrCodeId)) merged.push(c);
    }
    return merged
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, MAX_RECENT);
  }, [localScans, cloudScansRaw]);

  // ── Pull-to-refresh: bust disk cache then re-fetch ────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) invalidateHomeScansCache(user.id);
    await loadLocalScans(user?.id);
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: homeQueryKey(user.id) });
      await refetchCloud();
    }
    setRefreshing(false);
  }, [loadLocalScans, user?.id, refetchCloud]);

  // ── Delete a local scan from AsyncStorage ─────────────────────────────────
  const deleteScan = useCallback(async (scanId: string) => {
    if (!user?.id) return;
    try {
      const stored = await AsyncStorage.getItem(localStorageKey(user.id));
      if (!stored) return;
      const updated = (JSON.parse(stored) as LocalScan[]).filter((s) => s.id !== scanId);
      await AsyncStorage.setItem(localStorageKey(user.id), JSON.stringify(updated));
      setLocalScans(updated);
    } catch {}
  }, [user?.id]);

  return {
    recentScans,
    isLoading: cloudLoading && (!cloudScansRaw || (cloudScansRaw as LocalScan[]).length === 0),
    refreshing,
    onRefresh,
    deleteScan,
  };
}
