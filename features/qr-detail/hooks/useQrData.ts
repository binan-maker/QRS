import { useState, useEffect, useCallback } from "react";
import { getQrCodeById, getOrCreateQrCode, type QrCodeData } from "@/services/qr/qr-service";
import { getCachedQrDetail, setCachedQrDetail } from "@/services/cache/qr-cache";
import { smartOpenContent } from "@/shared/utils/smart-open";
import { detectContentType } from "@/shared/utils/qr-content";
import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";
import { useAuth } from "@/shared/contexts/AuthContext";

export type QrDetail = QrCodeData;

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

export function useQrData(id: string, hint?: { content: string; contentType?: string }): UseQrDataResult {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [qrCode, setQrCode] = useState<QrCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [totalScans, setTotalScans] = useState(0);
  const [initialDataReady, setInitialDataReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setLoading(false); setInitialDataReady(true); }, 2500);
    return () => clearTimeout(timer);
  }, [id]);

  const applyFallback = useCallback(async () => {
    const cached = await getCachedQrDetail<QrCodeData>(id, user?.id ?? null);
    if (cached) {
      setQrCode(cached);
      setTotalScans(cached.scanCount || 0);
      setOfflineMode(true);
      setInitialDataReady(true);
    } else if (hint?.content) {
      setQrCode({
        id: id || "temp",
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
  }, [id, hint?.content, hint?.contentType, user?.id]);

  const fetchQrData = useCallback(async () => {
    if (!id || !isOnline) {
      await applyFallback();
      setLoading(false);
      return;
    }
    try {
      let data = await getQrCodeById(id);
      if (!data && hint?.content) data = await getOrCreateQrCode(hint.content);
      if (data) {
        setQrCode(data);
        setTotalScans(data.scanCount || 0);
        setLoadError(false);
        setOfflineMode(false);
        setInitialDataReady(true);
        void setCachedQrDetail(id, user?.id ?? null, data);
      } else {
        await applyFallback();
      }
    } catch {
      await applyFallback();
    } finally {
      setLoading(false);
    }
  }, [id, hint?.content, isOnline, user?.id, applyFallback]);

  useEffect(() => { fetchQrData(); }, [fetchQrData]);

  const handleOpenContent = useCallback(async () => {
    const content = qrCode?.content || hint?.content || "";
    if (content) {
      await smartOpenContent(content, qrCode?.contentType || hint?.contentType || detectContentType(content));
    }
  }, [qrCode, hint?.content, hint?.contentType]);

  return {
    qrCode, loading, loadError, offlineMode,
    offlineContent: hint?.content, offlineContentType: hint?.contentType,
    totalScans, initialDataReady, handleOpenContent, refreshQrData: fetchQrData,
  };
}
