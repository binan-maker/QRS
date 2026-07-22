import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { Platform } from "react-native";

// Evaluated once at module load — avoids a branch per scan call.
const PLATFORM: "android" | "ios" | "web" | "unknown" =
  Platform.OS === "android" ? "android" :
  Platform.OS === "ios"     ? "ios"     :
  Platform.OS === "web"     ? "web"     : "unknown";
import { router } from "expo-router";
import { safePush } from "@/shared/utils/navigation";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "@/shared/utils/haptics";
import { scanFromURLAsync } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAnonymousQrContent } from "@/services/cache/anonymous-session";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  getOrCreateQrCode,
  recordScan,
  detectContentType,
  getQrCodeId,
} from "@/lib/firestore-service";
import { validateQrInput } from "@/services/profanity-filter";
import {
  consumeAnonScanSlot,
  ANON_CONVERSION_MILESTONES,
  ANON_CONVERSION_MESSAGES,
} from "@/features/scanner/utils/anon-scan-limit";
import { runSecurityCheck } from "@/features/scanner/utils/security-analysis";
import { decodeQrFromImageUri } from "@/features/scanner/utils/qr-decode";
import { appendToLocalScanHistory, makeScanEntry } from "@/features/scanner/utils/scan-history";
import { emitScanEvent } from "@/services/scan-history-service";
import type { ScanModalControls } from "@/features/scanner/hooks/useScanModals";

const GUARD_PATTERN =
  /\/guard\/([A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4})(?:[/?#]|$)/;

const STANDARD_PATTERN =
  /\/go\/([A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4})(?:[/?#]|$)/i;

export interface ScanProcessorParams {
  anonymousMode:          boolean;
  scanned:                boolean;
  setScanned:             (v: boolean) => void;
  setProcessing:          (v: boolean) => void;
  setScanSuccess:         (v: boolean) => void;
  scanLockRef:            MutableRefObject<boolean>;
  canScanRef:             MutableRefObject<boolean>;
  modalControls:          ScanModalControls;
  showScannerMsg:         (msg: string, type?: "error" | "warning" | "info") => void;
  showGalleryError:       (msg: string) => void;
  setConversionBannerMsg: (msg: string | null) => void;
  isCameraAvailable?:     boolean;
}

export function useScanProcessor({
  anonymousMode,
  scanned,
  setScanned,
  setProcessing,
  setScanSuccess,
  scanLockRef,
  canScanRef,
  modalControls,
  showScannerMsg,
  showGalleryError,
  setConversionBannerMsg,
  isCameraAvailable = true,
}: ScanProcessorParams) {
  const { user, token } = useAuth();

  // ── Timer refs — cleaned up on unmount ────────────────────────────────────
  const autoResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoResetGenRef   = useRef(0);   // generation counter: detects superseded resets
  const navResetTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    if (navResetTimerRef.current)  clearTimeout(navResetTimerRef.current);
  }, []);

  // ─── Auto-reset after an error so the scanner is ready for the next scan ─────
  // Uses a generation counter so a reset scheduled for Scan A cannot fire during
  // Scan B if the user triggers a new scan within the cooldown window.
  // Previously: raw setTimeout with no ref, no cleanup, and no race guard.
  function autoResetAfterError(delayMs = 2500) {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    const gen = ++autoResetGenRef.current;
    autoResetTimerRef.current = setTimeout(() => {
      autoResetTimerRef.current = null;
      if (autoResetGenRef.current !== gen) return; // superseded by a newer scan
      setScanned(false);
      setProcessing(false);
      setScanSuccess(false);
      scanLockRef.current = false;
      canScanRef.current  = true;
    }, delayMs);
  }

  function navigateToQrDetail(qrId: string, content?: string, contentType?: string) {
    setScanSuccess(true);
    if (content) {
      safePush({
        pathname: `/qr-detail/${qrId}`,
        params: { hintContent: content, hintContentType: contentType || "text" },
      } as any);
    } else {
      safePush(`/qr-detail/${qrId}`);
    }
    // Auto-clear tick after navigation — prevents it staying stuck if the
    // user returns to the scanner before useFocusEffect fires.
    // Timer stored in ref so it can be cancelled if the component unmounts.
    if (navResetTimerRef.current) clearTimeout(navResetTimerRef.current);
    navResetTimerRef.current = setTimeout(() => {
      navResetTimerRef.current = null;
      setScanSuccess(false);
      setScanned(false);
    }, 1200);
  }

  // ─── Offline path ─────────────────────────────────────────────────────────────
  async function processOfflineScan(content: string, scanSource: "camera" | "gallery" = "camera") {
    const validation = validateQrInput(content);
    if (!validation.valid) {
      setProcessing(false);
      showScannerMsg(validation.error || "Invalid QR code content", "error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      autoResetAfterError();
      return;
    }

    const contentType = detectContentType(content);
    const qrId        = await getQrCodeId(content);

    await AsyncStorage.setItem(
      `qr_content_${qrId}`,
      JSON.stringify({ content, contentType })
    ).catch(() => {});

    if (user?.id) {
      await appendToLocalScanHistory(
        user.id,
        makeScanEntry(content, contentType, qrId, scanSource, true)
      );
    }

    setProcessing(false);

    if (contentType === "url") {
      const check = runSecurityCheck(content);
      if (check.hasThreat) {
        modalControls.openSafetyModal(qrId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        emitScanEvent(qrId, { platform: PLATFORM, contentType, verdict: "flagged", scanSource });
        return;
      }
    }

    emitScanEvent(qrId, { platform: PLATFORM, contentType, verdict: "safe", scanSource });
    await navigateToQrDetail(qrId, content, contentType);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        autoResetAfterError();
        return;
      }

      const validation = validateQrInput(content);
      if (!validation.valid) {
        setProcessing(false);
        showScannerMsg(validation.error || "Invalid QR code content", "error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        autoResetAfterError();
        return;
      }

      const contentType = detectContentType(content);
      const qrId        = await getQrCodeId(content);
      setAnonymousQrContent(qrId, content, contentType);
      setProcessing(false);

      if (ANON_CONVERSION_MILESTONES.has(slot.totalCount)) {
        setConversionBannerMsg(ANON_CONVERSION_MESSAGES[slot.totalCount] ?? null);
      }

      if (contentType === "url") {
        const check = runSecurityCheck(content);
        if (check.hasThreat) {
          modalControls.openSafetyModal(qrId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          // Record event even for anonymous flagged scans — no PII stored
          emitScanEvent(qrId, { platform: PLATFORM, contentType, verdict: "flagged", scanSource: "camera" });
          return;
        }
      }

      emitScanEvent(qrId, { platform: PLATFORM, contentType, verdict: "safe", scanSource: "camera" });
      await navigateToQrDetail(qrId, content, contentType);
    } catch (e: any) {
      setProcessing(false);
      showScannerMsg(e.message || "Could not process QR code. Please try again.", "error");
      autoResetAfterError();
    }
  }


  // ─── Background Firestore sync (fire-and-forget) ──────────────────────────────
  function _backgroundSync(
    content:     string,
    localQrId:   string,
    contentType: string,
    scanSource:  "camera" | "gallery",
    verdict:     "safe" | "flagged" | "unknown" = "safe"
  ) {
    (async () => {
      try {
        const qr = await getOrCreateQrCode(content);
        await AsyncStorage.setItem(
          `qr_content_${qr.id}`,
          JSON.stringify({ content: qr.content, contentType: qr.contentType })
        ).catch(() => {});
        if (user?.id) {
          recordScan(qr.id, content, qr.contentType, user.id, false, scanSource).catch(() => {});
          await appendToLocalScanHistory(
            user.id,
            makeScanEntry(content, qr.contentType, qr.id, scanSource)
          );
        }
        emitScanEvent(qr.id, {
          platform: PLATFORM,
          contentType: qr.contentType,
          verdict,
          scanSource,
        });
      } catch {}
    })();
  }

  // ─── Main scan path ───────────────────────────────────────────────────────────
  async function processScan(content: string, scanSource: "camera" | "gallery" = "camera") {
    const routeGuard = async (uuid: string, param: string) => {
      setProcessing(false);
      setScanSuccess(true);
      const isGuard = param === "guardUuid";
      showScannerMsg(
        isGuard ? "Living Shield QR detected" : "BinRo standard code detected",
        "info"
      );
      const qrId = await getQrCodeId(content);
      safePush(`/qr-detail/${qrId}?${param}=${uuid}`);
      // Always emit an event for guard/standard QR scans (these are URLs, treat as safe)
      emitScanEvent(qrId, { platform: PLATFORM, contentType: "url", verdict: "safe", scanSource });
      // Store timer in ref so it can be cancelled on unmount (previously leaked)
      if (navResetTimerRef.current) clearTimeout(navResetTimerRef.current);
      navResetTimerRef.current = setTimeout(() => {
        navResetTimerRef.current = null;
        setScanSuccess(false);
        setScanned(false);
      }, 1200);
    };

    const guardMatch    = content.match(GUARD_PATTERN);
    const standardMatch = content.match(STANDARD_PATTERN);

    if (user && anonymousMode) {
      if (guardMatch)    { await routeGuard(guardMatch[1].toUpperCase(),    "guardUuid");    return; }
      if (standardMatch) { await routeGuard(standardMatch[1].toUpperCase(), "standardUuid"); return; }
      await processScanAnonymous(content);
      return;
    }

    if (guardMatch)    { await routeGuard(guardMatch[1].toUpperCase(),    "guardUuid");    return; }
    if (standardMatch) { await routeGuard(standardMatch[1].toUpperCase(), "standardUuid"); return; }

    setProcessing(true);
    try {
      const validation = validateQrInput(content);
      if (!validation.valid) {
        setProcessing(false);
        showScannerMsg(validation.error || "Invalid QR code content", "error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        autoResetAfterError();
        return;
      }

      const qrId        = await getQrCodeId(content);
      const contentType = detectContentType(content);

      await AsyncStorage.setItem(
        `qr_content_${qrId}`,
        JSON.stringify({ content, contentType })
      ).catch(() => {});

      setProcessing(false);

      if (contentType === "url") {
        const check = runSecurityCheck(content);
        if (check.hasThreat) {
          modalControls.openSafetyModal(qrId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          _backgroundSync(content, qrId, contentType, scanSource, "flagged");
          return;
        }
      }

      navigateToQrDetail(qrId, content, contentType);
      _backgroundSync(content, qrId, contentType, scanSource, "safe");
    } catch {
      await processOfflineScan(content, scanSource);
    }
  }

  // ─── Public handlers ──────────────────────────────────────────────────────────
  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      // scanLockRef + canScanRef already gate re-entry atomically — the `scanned`
      // state check is redundant and forcing it into deps caused the callback to
      // be recreated on every successful scan (a stale-closure churn cycle).
      if (!canScanRef.current || scanLockRef.current) return;
      scanLockRef.current = true;
      canScanRef.current  = false;
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await processScan(data, "camera");
    },
    [anonymousMode, user, token]
  );

  async function decodeImageViaServer(base64: string): Promise<string | null> {
    try {
      const { getApiUrl } = await import("@/shared/utils/query-client");
      const baseUrl = getApiUrl();
      const url = new URL("/api/qr/decode-image", baseUrl).toString();
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64: base64 }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.content ?? null;
    } catch {
      return null;
    }
  }

  async function handlePickImage() {
    if (!token) {
      showScannerMsg("Sign in to scan QR codes from your gallery.", "info");
      return;
    }

    // Acquire the scan lock so a camera decode cannot race a gallery decode.
    // Every exit path (cancel, no content, error) must call releaseLock() to
    // restore canScanRef so the camera is ready again.
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    canScanRef.current  = false;

    function releaseLock() {
      scanLockRef.current = false;
      canScanRef.current  = true;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isAndroidNative = Platform.OS === "android";

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:              ["images"],
        allowsEditing:           false,
        allowsMultipleSelection: false,
        exif:                    false,
        base64:                  isAndroidNative,
      });
    } catch {
      showGalleryError("Could not open your gallery. Please try again.");
      releaseLock();
      return;
    }

    if (result.canceled || !result.assets?.[0]) {
      releaseLock();
      return;
    }

    setProcessing(true);

    try {
      const asset = result.assets[0];
      let content: string | null = null;

      if (Platform.OS === "web") {
        content = await decodeQrFromImageUri(asset.uri);
      } else if (isAndroidNative && !isCameraAvailable) {
        content = await decodeImageViaServer(asset.base64 ?? "");
      } else {
        try {
          const results = await scanFromURLAsync(asset.uri, ["qr"]);
          content = results?.[0]?.data ?? null;
        } catch {
          if (asset.base64) content = await decodeImageViaServer(asset.base64);
        }
      }

      if (!content) {
        showGalleryError("No QR code found in this image — try a clearer or closer photo.");
        setProcessing(false);
        releaseLock();
        return;
      }

      // processScan manages its own setScanned/setProcessing state — do not
      // call releaseLock() here; the modal dismiss / resetScan flow handles it.
      await processScan(content, "gallery");
    } catch (e: any) {
      setProcessing(false);
      showGalleryError(e.message || "Something went wrong. Please try again.");
      releaseLock();
    }
  }

  return { handleBarCodeScanned, handlePickImage };
}
