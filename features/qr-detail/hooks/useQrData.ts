import { useState, useEffect, useCallback } from "react";
import { getQrCodeById, getOrCreateQrCode, type QrCodeData } from "@/services/qr/qr-service";
import { getCachedQrDetail, setCachedQrDetail } from "@/services/cache/qr-cache";
import { smartOpenContent } from "@/shared/utils/smart-open";
import { detectContentType } from "@/shared/utils/qr-content";
import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";
import { useAuth } from "@/shared/contexts/AuthContext";
import type { TrustScore } from "@/services/types";

export interface QrDetail {
  id: string;
  content: string;
  contentType: string;
  createdAt?: string;
  scanCount: number;
  commentCount: number;
  trustScore?: TrustScore;
}

export interface UseQrDataResult {
  qrCode: QrCodeData | null;
  loading: boolean;
  loadError: boolean;
  offlineMode: boolean;
  offlineContent?: string;
  offlineContentType?: string;
  totalScans: number;
  initialDataReady: boolean;
  handleOpenContent: () => Promise<void>;
  refreshQrData: () => Promise<void>;
}

export function useQrData(
  id: string,
  hint?: { content: string; contentType?: string }
): UseQrDataResult {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();

  const [qrCode, setQrCode] = useState<QrCodeData | null>(null);
  const [loading, setLoading] = useState<boolean>(!hint?.content);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [totalScans, setTotalScans] = useState<number>(0);
  const [initialDataReady, setInitialDataReady] = useState<boolean>(Boolean(hint?.content));

  const offlineContent = hint?.content;
  const offlineContentType = hint?.contentType;

  const fetchQrData = useCallback(async () => {
    if (!id) {
      if (hint?.content) {
        setQrCode({
          id: "temp",
          content: hint.content,
          contentType: hint.contentType || detectContentType(hint.content),
          createdAt: new Date().toISOString(),
          scanCount: 0,
          commentCount: 0,
        });
        setInitialDataReady(true);
        setLoading(false);
      } else {
        setLoadError(true);
        setLoading(false);
      }
      return;
    }

    try {
      if (!isOnline) {
        const cached = await getCachedQrDetail<QrCodeData>(id, user?.id ?? null);
        if (cached) {
          setQrCode(cached);
          setTotalScans(cached.scanCount || 0);
          setOfflineMode(true);
          setInitialDataReady(true);
          setLoading(false);
          return;
        }
        if (hint?.content) {
          setQrCode({
            id,
            content: hint.content,
            contentType: hint.contentType || detectContentType(hint.content),
            createdAt: new Date().toISOString(),
            scanCount: 0,
            commentCount: 0,
          });
          setOfflineMode(true);
          setInitialDataReady(true);
          setLoading(false);
          return;
        }
        setLoadError(true);
        setLoading(false);
        return;
      }

      let data = await getQrCodeById(id);
      if (!data && hint?.content) {
        data = await getOrCreateQrCode(hint.content);
      }

      if (data) {
        setQrCode(data);
        setTotalScans(data.scanCount || 0);
        setLoadError(false);
        setOfflineMode(false);
        setInitialDataReady(true);
        void setCachedQrDetail(id, user?.id ?? null, data);
      } else {
        const cached = await getCachedQrDetail<QrCodeData>(id, user?.id ?? null);
        if (cached) {
          setQrCode(cached);
          setTotalScans(cached.scanCount || 0);
          setOfflineMode(true);
          setInitialDataReady(true);
        } else if (hint?.content) {
          setQrCode({
            id,
            content: hint.content,
            contentType: hint.contentType || detectContentType(hint.content),
            createdAt: new Date().toISOString(),
            scanCount: 0,
            commentCount: 0,
          });
          setOfflineMode(true);
          setInitialDataReady(true);
        } else {
          setLoadError(true);
        }
      }
    } catch {
      const cached = await getCachedQrDetail<QrCodeData>(id, user?.id ?? null);
      if (cached) {
        setQrCode(cached);
        setTotalScans(cached.scanCount || 0);
        setOfflineMode(true);
        setInitialDataReady(true);
      } else if (hint?.content) {
        setQrCode({
          id,
          content: hint.content,
          contentType: hint.contentType || detectContentType(hint.content),
          createdAt: new Date().toISOString(),
          scanCount: 0,
          commentCount: 0,
        });
        setOfflineMode(true);
        setInitialDataReady(true);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [id, hint?.content, hint?.contentType, isOnline, user?.id]);

  useEffect(() => {
    fetchQrData();
  }, [fetchQrData]);

  const handleOpenContent = useCallback(async () => {
    const content = qrCode?.content || offlineContent || "";
    if (!content) return;
    const rawType = qrCode?.contentType || offlineContentType;
    const resolvedType = rawType || detectContentType(content);
    await smartOpenContent(content, resolvedType);
  }, [qrCode, offlineContent, offlineContentType]);

  const refreshQrData = useCallback(async () => {
    await fetchQrData();
  }, [fetchQrData]);

  return {
    qrCode,
    loading,
    loadError,
    offlineMode,
    offlineContent,
    offlineContentType,
    totalScans,
    initialDataReady,
    handleOpenContent,
    refreshQrData,
  };
}
