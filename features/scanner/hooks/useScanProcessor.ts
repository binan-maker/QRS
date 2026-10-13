import { useCallback, useRef, type MutableRefObject } from "react";
import { Platform } from "react-native";
import { safePush } from "@/shared/utils/navigation";
import * as Haptics from "@/shared/utils/haptics";
import { useAuth } from "@/shared/contexts/AuthContext";
import { getQrCodeId, detectContentType, isPaymentQr } from "@/lib/data-service";
import { validateQrInput } from "@/services/moderation/profanity-filter";
import { consumeAnonScanSlot, ANON_CONVERSION_MILESTONES, ANON_CONVERSION_MESSAGES } from "@/features/scanner/utils/anon-scan-limit";
import { pickAndDecodeImage } from "./useGalleryPicker";
import { persistScanResult } from "@/features/scanner/utils/scan-persistence";

const PLATFORM = Platform.OS === "android" ? "android" : Platform.OS === "ios" ? "ios" : Platform.OS === "web" ? "web" : "unknown";

export interface ScanProcessorParams {
  anonymousMode: boolean; scanned: boolean;
  setScanned: (v: boolean) => void; setProcessing: (v: boolean) => void; setScanSuccess: (v: boolean) => void;
  scanLockRef: MutableRefObject<boolean>; canScanRef: MutableRefObject<boolean>;
  showScannerMsg: (msg: string, type?: "error" | "warning" | "info") => void;
  showGalleryError: (msg: string) => void; setConversionBannerMsg: (msg: string | null) => void;
  isCameraAvailable?: boolean;
}

export function useScanProcessor({
  anonymousMode, setScanned, setProcessing, setScanSuccess, scanLockRef, canScanRef,
  showScannerMsg, showGalleryError, setConversionBannerMsg, isCameraAvailable = true,
}: ScanProcessorParams) {
  const { user, token } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetOnError = useCallback((d = 2500) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setScanned(false); setProcessing(false); setScanSuccess(false);
      scanLockRef.current = false; canScanRef.current = true;
    }, d);
  }, [setScanned, setProcessing, setScanSuccess, scanLockRef, canScanRef]);

  const navDetail = useCallback((qrId: string, content: string, cType: string) => {
    setScanSuccess(true);
    const eff = isPaymentQr(content) ? "payment" : cType || "text";
    safePush({ pathname: `/qr-detail/${qrId}`, params: { hintContent: content, hintContentType: eff } } as any);
    setTimeout(() => { setScanSuccess(false); setScanned(false); }, 1200);
  }, [setScanSuccess, setScanned]);

  const processScan = useCallback(async (content: string) => {
    const val = validateQrInput(content);
    if (!val.valid) {
      setProcessing(false); showScannerMsg(val.error || "Invalid QR", "error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      resetOnError(); return;
    }
    setProcessing(true);
    try {
      const qrId = await getQrCodeId(content);
      const cType = detectContentType(content);
      if (anonymousMode || !user) {
        const slot = await consumeAnonScanSlot();
        if (!slot.allowed) {
          setProcessing(false); showScannerMsg("Scan limit reached. Sign up to continue.", "info");
          resetOnError(); return;
        }
        if (ANON_CONVERSION_MILESTONES.has(slot.totalCount)) setConversionBannerMsg(ANON_CONVERSION_MESSAGES[slot.totalCount] ?? null);
      }
      await persistScanResult({ qrId, content, contentType: cType, user, anonymousMode, platform: PLATFORM });
      setProcessing(false); navDetail(qrId, content, cType);
    } catch { setProcessing(false); resetOnError(); }
  }, [user, anonymousMode, showScannerMsg, setProcessing, setConversionBannerMsg, navDetail, resetOnError]);

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (!canScanRef.current || scanLockRef.current) return;
    scanLockRef.current = true; canScanRef.current = false; setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await processScan(data);
  }, [canScanRef, scanLockRef, setScanned, processScan]);

  const handlePickImage = useCallback(async () => {
    if (scanLockRef.current) return;
    scanLockRef.current = true; canScanRef.current = false;
    const res = await pickAndDecodeImage(token, isCameraAvailable);
    if (!res.success) {
      if (res.error) showGalleryError(res.error);
      scanLockRef.current = false; canScanRef.current = true; return;
    }
    setProcessing(true); await processScan(res.content!);
  }, [token, isCameraAvailable, scanLockRef, canScanRef, showGalleryError, setProcessing, processScan]);

  return { handleBarCodeScanned, handlePickImage };
}
