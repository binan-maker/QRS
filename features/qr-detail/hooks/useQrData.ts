import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAnonymousQrContent } from "@/lib/cache/anonymous-session";
import { useNetworkStatus } from "@/lib/use-network";
import {
  loadQrDetail,
  subscribeToQrStats,
  getQrOwnerInfo,
  type QrOwnerInfo,
} from "@/lib/firestore-service";
import {
  getCachedQrDetail,
  setCachedQrDetail,
} from "@/lib/cache/qr-cache";

export interface QrDetail {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  isBranded?: boolean;
  signature?: string;
  ownerId?: string;
  ownerName?: string;
}

export function useQrData(id: string, userId: string | null) {
  const { isOnline } = useNetworkStatus();
  const [qrCode, setQrCode] = useState<QrDetail | null>(null);
  const [totalScans, setTotalScans] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineContent, setOfflineContent] = useState<string | null>(null);
  const [offlineContentType, setOfflineContentType] = useState<string>("text");
  const [ownerInfo, setOwnerInfo] = useState<QrOwnerInfo | null>(null);
  const [isQrOwner, setIsQrOwner] = useState(false);

  async function loadOfflineFallback() {
    const inMem = getAnonymousQrContent(id);
    if (inMem) {
      setOfflineContent(inMem.content);
      setOfflineContentType(inMem.contentType || "text");
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(`qr_content_${id}`);
      if (raw) {
        const { content, contentType } = JSON.parse(raw);
        setOfflineContent(content);
        setOfflineContentType(contentType || "text");
      }
    } catch {}
  }

  useEffect(() => {
    setQrCode(null);
    setOwnerInfo(null);
    setIsQrOwner(false);
    setLoadError(false);
    setOfflineMode(false);
    setLoading(true);
    setTotalScans(0);
    setTotalComments(0);
    setOfflineContent(null);
    setOfflineContentType("text");

    async function fetchDetail() {
      const cached = await getCachedQrDetail<any>(id, userId);
      if (cached) {
        setQrCode(cached.qrCode);
        setTotalScans(cached.totalScans || 0);
        setTotalComments(cached.totalComments || 0);
        if (cached.ownerInfo) {
          setOwnerInfo(cached.ownerInfo);
          setIsQrOwner(userId === cached.ownerInfo.ownerId);
        }
        setLoading(false);
        return;
      }

      const anonContent = getAnonymousQrContent(id);
      if (anonContent) {
        setOfflineMode(true);
        setOfflineContent(anonContent.content);
        setOfflineContentType(anonContent.contentType || "text");
        setLoading(false);
        return;
      }

      try {
        const detail = await loadQrDetail(id, userId);
        if (!detail) {
          if (!isOnline) {
            setOfflineMode(true);
            await loadOfflineFallback();
            setLoading(false);
            return;
          }
          setLoadError(true);
          setLoading(false);
          return;
        }
        setQrCode(detail.qrCode);
        setTotalScans(detail.totalScans || 0);
        setTotalComments(detail.totalComments || 0);
        try {
          await AsyncStorage.setItem(`qr_content_${id}`, JSON.stringify({
            content: detail.qrCode.content,
            contentType: detail.qrCode.contentType,
          }));
        } catch {}
        let ownerData: any = null;
        try {
          const owner = await getQrOwnerInfo(id);
          if (owner) {
            setOwnerInfo(owner);
            setIsQrOwner(userId === owner.ownerId);
            ownerData = owner;
          }
        } catch {}
        await setCachedQrDetail(id, userId, { ...detail, ownerInfo: ownerData });
        setLoading(false);
      } catch (err: any) {
        // Only enter offline mode for genuine network/connectivity failures.
        // Firebase error code "unavailable" means the client can't reach Firestore.
        // navigator.onLine gives a fast web-native check.
        // Any other Firebase error (permissions, config, etc.) should show an error,
        // not a misleading "You're offline" banner.
        const trulyOffline =
          err?.code === "unavailable" ||
          (typeof navigator !== "undefined" && !navigator.onLine) ||
          /network|offline|failed to fetch/i.test(err?.message || "");

        if (trulyOffline) {
          setOfflineMode(true);
          await loadOfflineFallback();
        } else {
          // Firebase failed for a non-network reason — try fallback content
          // so the user can still see the QR they scanned, but don't claim offline.
          await loadOfflineFallback();
          const hasFallbackContent = !!getAnonymousQrContent(id);
          if (hasFallbackContent) {
            setOfflineMode(true);
          } else {
            setLoadError(true);
          }
        }
        setLoading(false);
      }
    }

    fetchDetail();
  }, [id, userId]);

  useEffect(() => {
    if (offlineMode) return;
    const unsub = subscribeToQrStats(id, ({ scanCount, commentCount }) => {
      setTotalScans(scanCount);
      setTotalComments(commentCount);
    });
    return unsub;
  }, [id, offlineMode]);

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
  };
}
