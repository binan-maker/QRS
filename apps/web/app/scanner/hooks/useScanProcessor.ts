"use client";

// ─── Scan Processor ───────────────────────────────────────────────────────────
// 1:1 with features/scanner/hooks/useScanProcessor.ts

import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import {
  consumeAnonScanSlot,
  ANON_CONVERSION_MILESTONES,
  ANON_CONVERSION_MESSAGES,
} from "../utils/anon-scan-limit";
import { decodeQrFromImageUri } from "../utils/qr-decode";
import { appendToLocalScanHistory, makeScanEntry } from "../utils/scan-history";
import {
  validateQrInput,
  detectContentType,
  isPaymentQr,
  getQrCodeId,
  setAnonymousQrContent,
  getOrCreateQrCode,
  recordScan,
  emitScanEvent,
} from "../utils/security-analysis";
import { encodeQrShareCode, resolveQrShareCode } from "../../../lib/qr-share";
import { stopSharedCameraStream, isValidDecodedQr } from "../components/system/CameraView";

const PLATFORM = "web" as const;

export interface ScanProcessorParams {
  user:                   any;
  token?:                 string | null;
  anonymousMode:          boolean;
  scanned:                boolean;
  setScanned:             (v: boolean) => void;
  setProcessing:          (v: boolean) => void;
  setScanSuccess:         (v: boolean) => void;
  scanLockRef:            MutableRefObject<boolean>;
  canScanRef:             MutableRefObject<boolean>;
  showScannerMsg:         (msg: string, type?: "error" | "warning" | "info") => void;
  showGalleryError:       (msg: string) => void;
  setConversionBannerMsg: (msg: string | null) => void;
  isCameraAvailable?:     boolean;
}

export function useScanProcessor({
  user,
  token,
  anonymousMode,
  setScanned,
  setProcessing,
  setScanSuccess,
  scanLockRef,
  canScanRef,
  showScannerMsg,
  showGalleryError,
  setConversionBannerMsg,
}: ScanProcessorParams) {
  const router = useRouter();

  // Keep latest values in refs so async callbacks never read stale closures
  const userRef          = useRef(user);
  const tokenRef         = useRef(token);
  const anonymousModeRef = useRef(anonymousMode);

  useEffect(() => { userRef.current          = user;          }, [user]);
  useEffect(() => { tokenRef.current         = token;         }, [token]);
  useEffect(() => { anonymousModeRef.current = anonymousMode; }, [anonymousMode]);

  // ── Timer refs — cleaned up on unmount ────────────────────────────────────
  const autoResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoResetGenRef   = useRef(0);
  const navResetTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    if (navResetTimerRef.current)  clearTimeout(navResetTimerRef.current);
  }, []);

  // ─── Auto-reset after an error so the scanner is ready for the next scan ─────
  function autoResetAfterError(delayMs = 2500) {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    const gen = ++autoResetGenRef.current;
    autoResetTimerRef.current = setTimeout(() => {
      autoResetTimerRef.current = null;
      if (autoResetGenRef.current !== gen) return;
      setScanned(false);
      setProcessing(false);
      setScanSuccess(false);
      scanLockRef.current = false;
      canScanRef.current  = true;
    }, delayMs);
  }

  function navigateToQrDetail(qrId: string, content?: string, contentType?: string) {
    setScanSuccess(true);

    const effectiveType =
      content && isPaymentQr(content)
        ? "payment"
        : content && /^tel:/i.test(content)
          ? "phone"
          : contentType || "text";

    if (content) {
      setAnonymousQrContent(qrId, content, effectiveType);
      try {
        localStorage.setItem(
          `qr_content_${qrId}`,
          JSON.stringify({ content, contentType: effectiveType })
        );
      } catch {}
    }

    const shareCode =
      resolveQrShareCode(qrId, content) ||
      encodeQrShareCode(qrId) ||
      qrId;

    let targetUrl = `/qr/${encodeURIComponent(shareCode)}`;
    if (content) {
      try {
        const parsed = new URL(content, window.location.origin);
        const match = parsed.pathname.match(/\/qr\/([^/?#]+)/i);
        if (
          match?.[1] &&
          (parsed.origin === window.location.origin || /binro/i.test(parsed.hostname))
        ) {
          const existingContent = parsed.searchParams.get("content");
          const matchedShare =
            resolveQrShareCode(match[1], existingContent) || match[1];
          targetUrl = `/qr/${encodeURIComponent(matchedShare)}`;
        }
      } catch {}
    }

    stopSharedCameraStream();
    router.push(targetUrl);

    if (navResetTimerRef.current) clearTimeout(navResetTimerRef.current);
    navResetTimerRef.current = setTimeout(() => {
      navResetTimerRef.current = null;
      setScanSuccess(false);
      setScanned(false);
    }, 1200);
  }

  // ─── Offline path ─────────────────────────────────────────────────────────────
  async function processOfflineScan(content: string) {
    const validation = validateQrInput(content);
    if (!validation.valid) {
      setProcessing(false);
      showScannerMsg(validation.error || "Invalid QR code content", "error");
      autoResetAfterError();
      return;
    }

    const contentType = detectContentType(content);
    const qrId        = await getQrCodeId(content);

    try {
      localStorage.setItem(
        `qr_content_${qrId}`,
        JSON.stringify({ content, contentType })
      );
    } catch {}

    const currentUser = userRef.current;
    appendToLocalScanHistory(
      currentUser?.id ?? null,
      makeScanEntry(content, contentType, qrId, true)
    ).catch(() => {});

    setProcessing(false);

    emitScanEvent(qrId, { platform: PLATFORM, contentType, verdict: "unknown" });
    navigateToQrDetail(qrId, content, contentType);
  }

  // ─── Anonymous scan path ──────────────────────────────────────────────────────
  async function processScanAnonymous(content: string) {
    setProcessing(true);
    try {
      const slot = await consumeAnonScanSlot();
      if (!slot.allowed) {
        setProcessing(false);
        showScannerMsg(
          "You've reached 50 scans today. Sign up for unlimited scanning.",
          "info"
        );
        autoResetAfterError();
        return;
      }

      const validation = validateQrInput(content);
      if (!validation.valid) {
        setProcessing(false);
        showScannerMsg(validation.error || "Invalid QR code content", "error");
        autoResetAfterError();
        return;
      }

      const contentType = detectContentType(content);
      const qrId        = await getQrCodeId(content);
      setAnonymousQrContent(qrId, content, contentType);
      try {
        localStorage.setItem(
          `qr_content_${qrId}`,
          JSON.stringify({ content, contentType })
        );
      } catch {}

      setProcessing(false);

      if (!userRef.current && ANON_CONVERSION_MILESTONES.has(slot.totalCount)) {
        setConversionBannerMsg(ANON_CONVERSION_MESSAGES[slot.totalCount] ?? null);
      }

      emitScanEvent(qrId, { platform: PLATFORM, contentType, verdict: "unknown" });
      navigateToQrDetail(qrId, content, contentType);
      _backgroundSync(content, qrId, contentType, "unknown");
    } catch (e: any) {
      setProcessing(false);
      showScannerMsg(e.message || "Could not process QR code. Please try again.", "error");
      autoResetAfterError();
    }
  }

  // ─── Background sync (fire-and-forget) ────────────────────────────────────────
  function _backgroundSync(
    content:      string,
    _localQrId:   string,
    _contentType: string,
    verdict:      "safe" | "flagged" | "unknown" = "safe"
  ) {
    const currentUser = userRef.current;
    const isAnon      = anonymousModeRef.current;
    (async () => {
      try {
        const qr = await getOrCreateQrCode(content, currentUser);
        try {
          localStorage.setItem(
            `qr_content_${qr.id}`,
            JSON.stringify({ content: qr.content, contentType: qr.contentType })
          );
        } catch {}
        if (currentUser?.id && !isAnon) {
          recordScan(qr.id, content, qr.contentType, currentUser.id, false).catch(() => {});
          await appendToLocalScanHistory(
            currentUser.id,
            makeScanEntry(content, qr.contentType, qr.id)
          );
        } else {
          await appendToLocalScanHistory(
            null,
            makeScanEntry(content, qr.contentType, qr.id)
          );
        }
        emitScanEvent(qr.id, {
          platform: PLATFORM,
          contentType: qr.contentType,
          verdict,
        });
      } catch {}
    })();
  }

  // ─── Main scan path ───────────────────────────────────────────────────────────
  async function processScan(rawContent: string) {
    const content = (rawContent ?? "").trim();
    if (!content) {
      scanLockRef.current = false;
      canScanRef.current  = true;
      setScanned(false);
      return;
    }

    if (!userRef.current || anonymousModeRef.current) {
      await processScanAnonymous(content);
      return;
    }

    setProcessing(true);
    try {
      const validation = validateQrInput(content);
      if (!validation.valid) {
        setProcessing(false);
        showScannerMsg(validation.error || "Invalid QR code content", "error");
        autoResetAfterError();
        return;
      }

      const qrId        = await getQrCodeId(content);
      const contentType = detectContentType(content);

      try {
        localStorage.setItem(
          `qr_content_${qrId}`,
          JSON.stringify({ content, contentType })
        );
      } catch {}

      setProcessing(false);

      navigateToQrDetail(qrId, content, contentType);
      _backgroundSync(content, qrId, contentType, "unknown");
    } catch {
      await processOfflineScan(content);
    }
  }

  // ─── Public handlers ──────────────────────────────────────────────────────────
  const handleBarCodeScanned = useCallback(
    async (scanInput: any) => {
      const raw =
        typeof scanInput === "string"
          ? scanInput
          : scanInput?.data ?? scanInput?.rawValue ?? "";
      const data = typeof raw === "string" ? raw.trim() : "";
      if (!data || !isValidDecodedQr(data)) return;
      if (!canScanRef.current || scanLockRef.current) return;
      scanLockRef.current = true;
      canScanRef.current  = false;
      setScanned(true);
      await processScan(data);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function handlePickImage() {
    if (scanLockRef.current) return;

    function releaseLock() {
      scanLockRef.current = false;
      canScanRef.current  = true;
    }

    if (typeof document === "undefined") {
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);

    const cleanupInput = () => {
      if (input.parentNode) input.parentNode.removeChild(input);
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      cleanupInput();

      if (!file) {
        return;
      }

      if (scanLockRef.current) return;
      scanLockRef.current = true;
      canScanRef.current  = false;
      setScanned(true);
      setProcessing(true);
      const objectUrl = URL.createObjectURL(file);

      try {
        const content = await decodeQrFromImageUri(objectUrl);
        URL.revokeObjectURL(objectUrl);

        if (!content) {
          showGalleryError("No QR code found in this image — try a clearer or closer photo.");
          setScanned(false);
          setProcessing(false);
          releaseLock();
          return;
        }

        await processScan(content);
      } catch (e: any) {
        URL.revokeObjectURL(objectUrl);
        setScanned(false);
        setProcessing(false);
        showGalleryError(e?.message || "Something went wrong. Please try again.");
        releaseLock();
      }
    };

    try {
      input.click();
    } catch {
      cleanupInput();
      showGalleryError("Could not open your gallery. Please try again.");
      releaseLock();
    }
  }

  return { handleBarCodeScanned, handlePickImage };
}
