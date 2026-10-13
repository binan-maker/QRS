"use client";

import { useCallback, useRef, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { consumeAnonScanSlot, ANON_CONVERSION_MILESTONES, ANON_CONVERSION_MESSAGES } from "../utils/anon-scan-limit";
import { appendToLocalScanHistory, makeScanEntry } from "../utils/scan-history";
import {
  validateQrInput, detectContentType, isPaymentQr, getQrCodeId,
  setAnonymousQrContent, recordScan, getOrCreateQrCode,
} from "../utils/security-analysis";
import { pickWebGalleryImage } from "./useWebGalleryPicker";
import { stopSharedCameraStream } from "../components/system/CameraView";

export interface ScanProcessorParams {
  user: any; token?: string | null; anonymousMode: boolean; scanned: boolean;
  setScanned: (v: boolean) => void; setProcessing: (v: boolean) => void; setScanSuccess: (v: boolean) => void;
  scanLockRef: MutableRefObject<boolean>; canScanRef: MutableRefObject<boolean>;
  showScannerMsg: (msg: string, type?: "error" | "warning" | "info") => void;
  showGalleryError: (msg: string) => void; setConversionBannerMsg: (msg: string | null) => void;
  isCameraAvailable?: boolean;
}

export function useScanProcessor({
  user, token, anonymousMode, setScanned, setProcessing, setScanSuccess,
  scanLockRef, canScanRef, showScannerMsg, showGalleryError, setConversionBannerMsg,
}: ScanProcessorParams) {
  const router = useRouter();
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetOnError = useCallback((delay = 2500) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setScanned(false); setProcessing(false); setScanSuccess(false);
      scanLockRef.current = false; canScanRef.current = true;
    }, delay);
  }, [setScanned, setProcessing, setScanSuccess, scanLockRef, canScanRef]);

  const navDetail = useCallback((qrId: string, content: string, cType: string) => {
    setScanSuccess(true);
    stopSharedCameraStream();
    const eff = isPaymentQr(content) ? "payment" : cType || "text";
    router.push(`/qr/${qrId}?hintContent=${encodeURIComponent(content)}&hintContentType=${eff}`);
    setTimeout(() => { setScanSuccess(false); setScanned(false); }, 1200);
  }, [router, setScanSuccess, setScanned]);

  const processScan = useCallback(async (content: string) => {
    const val = validateQrInput(content);
    if (!val.valid) {
      setProcessing(false); showScannerMsg(val.error || "Invalid QR code", "error");
      resetOnError(); return;
    }
    setProcessing(true);
    try {
      const qrId = await getQrCodeId(content);
      const cType = detectContentType(content);
      if (anonymousMode || !user) {
        const slot = await consumeAnonScanSlot();
        if (!slot.allowed) {
          setProcessing(false); showScannerMsg("Daily scan limit reached. Sign in for unlimited scans.", "info");
          resetOnError(); return;
        }
        setAnonymousQrContent(qrId, content, cType);
        if (ANON_CONVERSION_MILESTONES.has(slot.totalCount)) setConversionBannerMsg(ANON_CONVERSION_MESSAGES[slot.totalCount] ?? null);
      }
      appendToLocalScanHistory(user?.id ?? null, makeScanEntry(content, cType, qrId, !user));
      if (user?.id && !anonymousMode) {
        getOrCreateQrCode(content).then((qr) => recordScan(qr?.id || qrId, content, qr?.contentType || cType, user.id, false)).catch(() => {});
      }
      setProcessing(false); navDetail(qrId, content, cType);
    } catch { setProcessing(false); resetOnError(); }
  }, [user, anonymousMode, showScannerMsg, setProcessing, setConversionBannerMsg, navDetail, resetOnError]);

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (!canScanRef.current || scanLockRef.current) return;
    scanLockRef.current = true; canScanRef.current = false; setScanned(true);
    await processScan(data);
  }, [canScanRef, scanLockRef, setScanned, processScan]);

  const handlePickImage = useCallback(() => {
    if (scanLockRef.current) return;
    scanLockRef.current = true; canScanRef.current = false;
    pickWebGalleryImage(token, (err) => {
      showGalleryError(err); scanLockRef.current = false; canScanRef.current = true;
    }, async (content) => {
      setProcessing(true); await processScan(content);
    });
  }, [token, scanLockRef, canScanRef, showGalleryError, setProcessing, processScan]);

  return { handleBarCodeScanned, handlePickImage };
}
