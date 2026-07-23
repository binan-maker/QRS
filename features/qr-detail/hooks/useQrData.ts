import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/shared/services/query-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAnonymousQrContent } from "@/services/cache/anonymous-session";
import {
  loadQrDetail,
  subscribeToQrStats,
  getQrOwnerInfo,
  type QrOwnerInfo,
} from "@/lib/firestore-service";
import {
  getCachedQrDetail,
  setCachedQrDetail,
  invalidateQrCache,
} from "@/services/cache/qr-cache";

async function recordViewedLocally(
  qrCodeId: string,
  content: string,
  contentType: string,
  userId: string
): Promise<void> {
  try {
    const key = `local_scan_history_${userId}`;
    const stored = await AsyncStorage.getItem(key);
    const arr: any[] = stored ? JSON.parse(stored) : [];
    const alreadyExists = arr.some((e) => e.qrCodeId === qrCodeId);
    if (alreadyExists) return;
    arr.unshift({
      id: `viewed_${qrCodeId}_${Date.now()}`,
      qrCodeId,
      content,
      contentType,
      scanSource: "viewed",
      scannedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

async function loadOfflineFallback(id: string): Promise<{ content: string; contentType: string } | null> {
  const inMem = getAnonymousQrContent(id);
  if (inMem) return { content: inMem.content, contentType: inMem.contentType || "text" };
  try {
    const raw = await AsyncStorage.getItem(`qr_content_${id}`);
    if (raw) {
      const { content, contentType } = JSON.parse(raw);
      return { content, contentType: contentType || "text" };
    }
  } catch {}
  return null;
}

type QrFetchResult =
  | { status: "data"; detail: any; isFreshFetch: boolean }
  | { status: "offline"; content: string; contentType: string }
  | { status: "error" };

async function fetchQrData(id: string, userId: string | null): Promise<QrFetchResult> {
  const cached = await getCachedQrDetail<any>(id, userId);
  if (cached) return { status: "data", detail: cached, isFreshFetch: false };

  let lastErr: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 1500));
      const detail = await loadQrDetail(id, userId);
      if (!detail) {
        if (attempt < 2) { lastErr = new Error("not_found"); continue; }
        const offline = await loadOfflineFallback(id);
        if (offline) return { status: "offline", ...offline };
        return { status: "error" };
      }
      AsyncStorage.setItem(`qr_content_${id}`, JSON.stringify({
        content: detail.qrCode.content,
        contentType: detail.qrCode.contentType,
      })).catch(() => {});
      return { status: "data", detail, isFreshFetch: true };
    } catch (err: any) {
      console.warn(`[qrData] Firestore fetch attempt ${attempt + 1}/3 failed: code=${err?.code} message=${err?.message}`);
      lastErr = err;
    }
  }

  const trulyOffline =
    lastErr?.code === "unavailable" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    /network|offline|failed to fetch/i.test(lastErr?.message || "");
  const offline = await loadOfflineFallback(id);
  if (offline && (trulyOffline || offline)) return { status: "offline", ...offline };
  return { status: "error" };
}

export interface QrDetail {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  isBranded?: boolean;
  signature?: string;
  ownerId?: string;
  ownerName?: string;
  ownerScanCount?: number;
  scanCountFrozen?: boolean;
  scanCountFreezeReason?: string;
  templateKey?: string | null;
  formValues?: { value: string; extra: Record<string, string> } | null;
  displayDestination?: string | null;
  isActive?: boolean;
  deactivationMessage?: string | null;
}

export function useQrData(
  id: string,
  userId: string | null,
  hint?: { content: string; contentType: string }
) {
  const [totalScans, setTotalScans] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [ownerInfo, setOwnerInfo] = useState<QrOwnerInfo | null>(null);
  const [isQrOwner, setIsQrOwner] = useState(false);

  const ownerFetchedForId = useRef<string | null>(null);

  const hintInitialData: QrFetchResult | undefined = hint?.content
    ? {
        status: "data",
        detail: {
          qrCode: { id, content: hint.content, contentType: hint.contentType, createdAt: "" },
          totalScans: 0,
          totalComments: 0,
          ownerInfo: null,
        },
        isFreshFetch: false,
      }
    : undefined;

  const { data: result, isPending, isError, refetch } = useQuery<QrFetchResult>({
    queryKey: ["qr-detail", id, userId],
    queryFn: () => fetchQrData(id, userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    initialData: hintInitialData,
    initialDataUpdatedAt: hintInitialData ? 0 : undefined,
  });

  const loading = isPending;
  const offlineMode = result?.status === "offline";
  const loadError = result?.status === "error" || isError;
  const qrCode: QrDetail | null = result?.status === "data" ? result.detail.qrCode : null;
  const offlineContent = result?.status === "offline" ? result.content : null;
  const offlineContentType = result?.status === "offline" ? result.contentType : "text";

  useEffect(() => {
    if (result?.status !== "data") return;
    const detail = result.detail;
    setTotalScans(detail.totalScans || 0);
    setTotalComments(detail.totalComments || 0);

    if (detail.ownerInfo) {
      setOwnerInfo(detail.ownerInfo);
      setIsQrOwner(userId === detail.ownerInfo.ownerId);
    }

    if (!result.isFreshFetch) return;

    if (userId && qrCode) {
      recordViewedLocally(id, qrCode.content, qrCode.contentType, userId).catch(() => {});
    }

    if (ownerFetchedForId.current === id) return;
    ownerFetchedForId.current = id;

    let cancelled = false;
    (async () => {
      let ownerData: any = null;
      try {
        const owner = await getQrOwnerInfo(id);
        if (!cancelled && owner) {
          setOwnerInfo(owner);
          setIsQrOwner(userId === owner.ownerId);
          ownerData = owner;
        }
      } catch {}
      if (!cancelled) {
        setCachedQrDetail(id, userId, { ...detail, ownerInfo: ownerData }).catch(() => {});
      }
    })();
    return () => { cancelled = true; };
  }, [result, id, userId]);

  useEffect(() => {
    if (!result || result.status !== "data") {
      ownerFetchedForId.current = null;
    }
  }, [id]);

  useEffect(() => {
    if (offlineMode) return;
    const unsub = subscribeToQrStats(id, ({ scanCount, commentCount }) => {
      setTotalScans(scanCount);
      setTotalComments(commentCount);
    });
    return unsub;
  }, [id, offlineMode]);

  // Clears the custom QR cache and forces TanStack Query to re-run fetchQrData.
  // Called by pull-to-refresh so owner info, scan counts, and QR metadata are
  // always up-to-date alongside comments.
  const refreshQrData = useCallback(async () => {
    invalidateQrCache(id);
    ownerFetchedForId.current = null;
    await refetch();
  }, [id, refetch]);

  return {
    qrCode,
    totalScans,
    totalComments,
    loading,
    loadError,
    offlineMode,
    offlineContent,
    offlineContentType,
    ownerInfo,
    isQrOwner,
    refreshQrData,
  };
}
