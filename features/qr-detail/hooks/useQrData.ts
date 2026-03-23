import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAnonymousQrContent } from "@/lib/cache/anonymous-session";
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

  async function loadOfflineFallback(): Promise<boolean> {
    const inMem = getAnonymousQrContent(id);
    if (inMem) {
      setOfflineContent(inMem.content);
      setOfflineContentType(inMem.contentType || "text");
      return true;
    }
    try {
      const raw = await AsyncStorage.getItem(`qr_content_${id}`);
      if (raw) {
        const { content, contentType } = JSON.parse(raw);
        setOfflineContent(content);
        setOfflineContentType(contentType || "text");
        return true;
      }
    } catch {}
    return false;
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

      // Retry up to 3 times to handle transient Firestore connection issues.
      let lastErr: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 1500));
          const detail = await loadQrDetail(id, userId);
          if (!detail) {
            // QR not found in Firestore yet — give it one more short wait then try
            // the offline fallback (covers recently-scanned QRs still propagating).
            if (attempt < 2) { lastErr = new Error("not_found"); continue; }
            const hasFallback = await loadOfflineFallback();
            if (hasFallback) {
              setOfflineMode(true);
            } else {
              setLoadError(true);
            }
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
          return;
        } catch (err: any) {
          lastErr = err;
        }
      }

      // All retries exhausted — decide between offline mode and load error.
      const trulyOffline =
        lastErr?.code === "unavailable" ||
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        /network|offline|failed to fetch/i.test(lastErr?.message || "");

      const hasFallback = await loadOfflineFallback();
      if (trulyOffline && hasFallback) {
        setOfflineMode(true);
      } else if (hasFallback) {
        // Firestore had an error but we have local content — show it without
        // the "offline" label so the user knows it's a server issue, not network.
        setOfflineMode(true);
      } else {
        setLoadError(true);
      }
      setLoading(false);
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
