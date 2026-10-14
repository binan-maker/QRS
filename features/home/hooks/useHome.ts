import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useAvatar, isUserUploadedPhoto } from "@/shared/contexts/AvatarContext";
import { getUserScansPaginated, deleteUserScan, deleteLocalScan } from "@/lib/data-service";
import { queryClient } from "@/lib/core/query-client";
import {
  getCachedHomeScans,
  peekCachedHomeScans,
  setCachedHomeScans,
  invalidateHomeScansCache,
} from "@/services/cache/qr-cache";
import {
  mergeAndDeduplicateScans,
  normalizeScanContent,
} from "@/services/scan-history/dedup";
import type { LocalScan } from "@/features/home/types";

const HOME_STALE_MS   = 5 * 60 * 1000;
const MAX_RECENT      = 5;
const CLOUD_FETCH     = 50;
const homeQueryKey    = (uid: string) => ["home-recent-scans", uid] as const;
const localStorageKey = (uid: string) => `local_scan_history_${uid}`;

export function useHome() {
  const { user, isLoading: authLoading } = useAuth();
  const { url: appAvatarUrl, isHydrated, syncAvatar } = useAvatar();
  const [localScans,  setLocalScans]  = useState<LocalScan[]>([]);
  const [localLoaded, setLocalLoaded] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const warmedHomeScans = user?.id
    ? peekCachedHomeScans<LocalScan[]>(user.id)
    : null;

  // ── Sync user avatar with AvatarContext ──────────────────────────────────────
  useEffect(() => {
    if (!user?.photoURL) return;
    if (isUserUploadedPhoto(user.photoURL)) {
      syncAvatar(user.photoURL);
    } else if (isHydrated && !appAvatarUrl) {
      syncAvatar(user.photoURL);
    }
  }, [user?.id, user?.photoURL, isHydrated, appAvatarUrl, syncAvatar]);

  // ── Disk pre-warm ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    getCachedHomeScans<LocalScan[]>(user.id).then((cached) => {
      if (!cached || cached.length === 0) return;
      const qk = homeQueryKey(user.id);
      const existing = queryClient.getQueryData<LocalScan[]>(qk);
      if (!existing || existing.length === 0) {
        queryClient.setQueryData(qk, cached);
        queryClient.invalidateQueries({ queryKey: qk, refetchType: "active" });
      }
    }).catch(() => {});
  }, [user?.id]);

  // ── Cloud scans: last MAX_RECENT from database ─────────────────────────────
  const {
    data:    cloudScansRaw,
    refetch: refetchCloud,
  } = useQuery<LocalScan[]>({
    queryKey: homeQueryKey(user?.id ?? ""),
    queryFn: async () => {
      const { items } = await getUserScansPaginated(user!.id, CLOUD_FETCH);
      const scans = (items || []).map((s: any): LocalScan => ({
        id:          s.id,
        content:     s.content,
        contentType: s.contentType,
        scannedAt:   s.scannedAt,
        qrCodeId:    s.qrCodeId,
        source:      "cloud",
      }));
      if (scans.length > 0) {
        setCachedHomeScans<LocalScan[]>(user!.id, scans).catch(() => {});
      }
      return scans;
    },
    staleTime:            HOME_STALE_MS,
    gcTime:               30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount:       true,
    enabled:              !!user?.id && !authLoading,
    initialData:          warmedHomeScans ?? undefined,
    initialDataUpdatedAt: warmedHomeScans ? 0 : undefined,
  });

  // ── Local scans from device AsyncStorage ──────────────────────────────────
  const loadLocalScans = useCallback(async (userId?: string | null) => {
    try {
      const keysToTry = [
        userId ? localStorageKey(userId) : null,
        "local_scan_history",
      ].filter(Boolean) as string[];

      const combined: LocalScan[] = [];
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
              const dedupKey = qrId ? `qr:${qrId}` : `c:${normalizeScanContent(content)}`;
              if (seen.has(dedupKey)) continue;
              seen.add(dedupKey);

              combined.push({
                id:          String(item.id || qrId || Date.now()),
                content,
                contentType: item.contentType || item.content_type || "url",
                scannedAt:   item.scannedAt || item.scanned_at || new Date().toISOString(),
                qrCodeId:    qrId,
                source:      "local",
              });
            }
          }
        }
      }

      setLocalScans(combined);

      if (userId && combined.length > 0) {
        AsyncStorage.setItem(localStorageKey(userId), JSON.stringify(combined)).catch(() => {});
      }
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

      if (currentUserId && !authLoading) {
        refetchCloud().catch(() => {});
      }
    }, [user?.id, authLoading, loadLocalScans, refetchCloud])
  );

  // ── Merge local + cloud; deduplicate; take MAX_RECENT ────────────────────
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
      setRefreshing(false);
    }
  }, [loadLocalScans, user?.id, refetchCloud]);

  // ── Delete a scan (local or cloud) ────────────────────────────────────────
  const deleteScan = useCallback(async (scanId: string) => {
    if (!user?.id) return;

    const qk = homeQueryKey(user.id);
    const cloudData = queryClient.getQueryData<LocalScan[]>(qk);
    const targetScan = (cloudData || []).find((s) => s.id === scanId) ||
                       localScans.find((s) => s.id === scanId);
    const targetQrId = targetScan?.qrCodeId;
    const targetNormContent = targetScan?.content ? normalizeScanContent(targetScan.content) : null;

    const isMatch = (s: LocalScan) => {
      if (s.id === scanId) return true;
      if (targetQrId && s.qrCodeId === targetQrId) return true;
      if (targetNormContent && s.content && normalizeScanContent(s.content) === targetNormContent) return true;
      return false;
    };

    const isCloudScan = Array.isArray(cloudData) && cloudData.some(isMatch);

    if (isCloudScan) {
      const prev = cloudData;
      queryClient.setQueryData<LocalScan[]>(qk, (old) =>
        old ? old.filter((s) => !isMatch(s)) : old
      );
      invalidateHomeScansCache(user.id);

      try {
        await deleteUserScan(user.id, scanId, targetQrId);
      } catch {
        queryClient.setQueryData(qk, prev);
      }
    } else {
      try {
        await deleteLocalScan(user.id, {
          id: scanId,
          qrCodeId: targetQrId,
          content: targetScan?.content,
        });
        setLocalScans((prev) => prev.filter((s) => !isMatch(s)));
      } catch {}
    }
  }, [user?.id, localScans]);

  return {
    user,
    recentScans,
    isLoading: !localLoaded,
    refreshing,
    onRefresh,
    deleteScan,
  };
}
