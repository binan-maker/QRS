import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/shared/contexts/AuthContext";
import { getUserScansPaginated, deleteUserScan } from "@/lib/firestore-service";
import { queryClient } from "@/lib/query-client";
import {
  getCachedHomeScans,
  setCachedHomeScans,
  invalidateHomeScansCache,
} from "@/services/cache/qr-cache";
import { mergeAndDeduplicateScans } from "@/services/scan-history/dedup";
import type { LocalScan } from "@/features/home/types";

const HOME_STALE_MS   = 5 * 60 * 1000;
const MAX_RECENT      = 5;
// Fetch more from cloud than we display so that dedup (local vs cloud
// minute-bucket collapse) never reduces the visible count below MAX_RECENT.
const CLOUD_FETCH     = MAX_RECENT * 3; // fetch 15, show 5
const homeQueryKey    = (uid: string) => ["home-recent-scans", uid] as const;
const localStorageKey = (uid: string) => `local_scan_history_${uid}`;

export function useRecentScans() {
  const { user } = useAuth();
  const [localScans,  setLocalScans]  = useState<LocalScan[]>([]);
  const [localLoaded, setLocalLoaded] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  // ── Disk pre-warm: seed the React Query cache from disk before the
  //    network call fires so the list appears instantly on cold launch.
  //    BUG FIX: After seeding, immediately invalidate (refetchType:'active')
  //    so React Query kicks off a background network fetch right away.
  //    Without this, setQueryData stamps dataUpdatedAt=now, staleTime makes
  //    the data look "fresh", and refetchOnMount:true never fires — the user
  //    is stuck with stale disk cache data until the staleTime window expires.
  useEffect(() => {
    if (!user?.id) return;
    getCachedHomeScans<LocalScan[]>(user.id).then((cached) => {
      if (!cached || cached.length === 0) return;
      const qk = homeQueryKey(user.id);
      const existing = queryClient.getQueryData<LocalScan[]>(qk);
      if (!existing || existing.length === 0) {
        queryClient.setQueryData(qk, cached);
        // Mark stale immediately so a live fetch always runs behind the cached render
        queryClient.invalidateQueries({ queryKey: qk, refetchType: "active" });
      }
    }).catch(() => {});
  }, [user?.id]);

  // ── Cloud scans: last MAX_RECENT from Firestore ───────────────────────────
  const {
    data:      cloudScansRaw,
    refetch:   refetchCloud,
    isPending: cloudPending,
  } = useQuery<LocalScan[]>({
    queryKey: homeQueryKey(user?.id ?? ""),
    queryFn: async () => {
      const { items } = await getUserScansPaginated(user!.id, CLOUD_FETCH);
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
    refetchOnMount:      true,
    enabled:             !!user?.id,
  });

  // ── Local scans from device AsyncStorage ──────────────────────────────────
  const loadLocalScans = useCallback(async (userId?: string | null) => {
    if (!userId) { setLocalScans([]); setLocalLoaded(true); return; }
    try {
      const stored = await AsyncStorage.getItem(localStorageKey(userId));
      setLocalScans(stored ? JSON.parse(stored) : []);
    } catch {
      setLocalScans([]);
    }
    setLocalLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const currentUserId = user?.id ?? null;
      if (prevUserIdRef.current !== currentUserId) {
        prevUserIdRef.current = currentUserId;
        setLocalScans([]);
        setLocalLoaded(false);
      }
      loadLocalScans(currentUserId);

      if (currentUserId) {
        const state = queryClient.getQueryState(homeQueryKey(currentUserId));
        const now = Date.now();
        if (!state?.dataUpdatedAt || now - state.dataUpdatedAt > HOME_STALE_MS) {
          refetchCloud();
        }
      }
    }, [user?.id, loadLocalScans, refetchCloud])
  );

  // ── Merge local + cloud; deduplicate; take MAX_RECENT ────────────────────
  // Dedup algorithm: two entries are the same event iff they share qrCodeId
  // AND fall in the same 60-second bucket. This collapses offline + sync
  // double-writes without merging distinct scan events of the same QR code.
  // Logic lives in services/scan-history/dedup.ts.
  const recentScans = useMemo<LocalScan[]>(
    () => mergeAndDeduplicateScans(localScans, cloudScansRaw ?? [], MAX_RECENT),
    [localScans, cloudScansRaw],
  );

  // ── Pull-to-refresh: bust disk cache then re-fetch ────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.id) invalidateHomeScansCache(user.id);
      await loadLocalScans(user?.id);
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: homeQueryKey(user.id) });
        await refetchCloud().catch(() => {});
      }
    } finally {
      // Always stop the spinner — prevents it getting stuck when Firestore
      // is offline or refetchCloud throws an unhandled rejection.
      setRefreshing(false);
    }
  }, [loadLocalScans, user?.id, refetchCloud]);

  // ── Delete a scan (local or cloud) ────────────────────────────────────────
  // BUG FIX: old deleteScan only removed from AsyncStorage. Cloud scans (the
  // majority for logged-in users) are never in AsyncStorage — they live in the
  // React Query cache populated by getUserScansPaginated. Calling the old code
  // on a cloud scan found stored=null → early return → card never disappeared.
  //
  // Fix: check whether the scan ID exists in the React Query cloud cache first.
  // If yes → optimistic cache removal + Firestore soft-delete.
  // If no  → it's a local-only scan → remove from AsyncStorage as before.
  const deleteScan = useCallback(async (scanId: string) => {
    if (!user?.id) return;

    const qk = homeQueryKey(user.id);
    const cloudData = queryClient.getQueryData<LocalScan[]>(qk);
    const isCloudScan = Array.isArray(cloudData) && cloudData.some((s) => s.id === scanId);

    if (isCloudScan) {
      // Snapshot for rollback
      const prev = cloudData;

      // Optimistic removal from React Query cache
      queryClient.setQueryData<LocalScan[]>(qk, (old) =>
        old ? old.filter((s) => s.id !== scanId) : old
      );
      // Bust disk cache so next pre-warm won't re-show the deleted item
      invalidateHomeScansCache(user.id);

      try {
        await deleteUserScan(user.id, scanId);
      } catch {
        // Revert optimistic update on failure
        queryClient.setQueryData(qk, prev);
      }
    } else {
      // Local scan: remove from AsyncStorage
      try {
        const stored = await AsyncStorage.getItem(localStorageKey(user.id));
        if (!stored) return;
        const updated = (JSON.parse(stored) as LocalScan[]).filter((s) => s.id !== scanId);
        await AsyncStorage.setItem(localStorageKey(user.id), JSON.stringify(updated));
        setLocalScans(updated);
      } catch {}
    }
  }, [user?.id]);

  return {
    recentScans,
    // Show skeleton only until local AsyncStorage is ready.
    // Cloud data merges in silently once it arrives — no need to block the
    // entire list on a Firestore round-trip.
    isLoading: !localLoaded,
    refreshing,
    onRefresh,
    deleteScan,
  };
}
