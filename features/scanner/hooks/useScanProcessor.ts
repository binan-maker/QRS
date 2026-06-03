import { useCallback } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
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
  scanLockRef:            React.MutableRefObject<boolean>;
  canScanRef:             React.MutableRefObject<boolean>;
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

  // ─── Auto-reset after an error so the scanner is ready for the next scan ─────
  // Without this, scanned/lock state stays true and the camera never re-enables.
  function autoResetAfterError(delayMs = 2500) {
    setTimeout(() => {
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
      router.push({
        pathname: `/qr-detail/${qrId}`,
        params: { hintContent: content, hintContentType: contentType || "text" },
      } as any);
    } else {
      router.push(`/qr-detail/${qrId}`);
    }
    // Auto-clear tick after navigation — prevents it staying stuck if the
    // user returns to the scanner before useFocusEffect fires.
    setTimeout(() => {
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
        modalControls.openSafetyModal(qrId, check.warnings, check.riskLevel);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        emitScanEvent(qrId, { platform: _getPlatform(), contentType, verdict: "flagged", scanSource });
        return;
      }
    }

    emitScanEvent(qrId, { platform: _getPlatform(), contentType, verdict: "safe", scanSource });
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
          modalControls.openSafetyModal(qrId, check.warnings, check.riskLevel);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          // Record event even for anonymous flagged scans — no PII stored
          emitScanEvent(qrId, { platform: _getPlatform(), contentType, verdict: "flagged", scanSource: "camera" });
          return;
        }
      }

      emitScanEvent(qrId, { platform: _getPlatform(), contentType, verdict: "safe", scanSource: "camera" });
      await navigateToQrDetail(qrId, content, contentType);
    } catch (e: any) {
      setProcessing(false);
      showScannerMsg(e.message || "Could not process QR code. Please try again.", "error");
      autoResetAfterError();
    }
  }

  function _getPlatform(): "android" | "ios" | "web" | "unknown" {
    if (Platform.OS === "android") return "android";
    if (Platform.OS === "ios") return "ios";
    if (Platform.OS === "web") return "web";
    return "unknown";
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
          platform: _getPlatform(),
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
        isGuard ? "Living Shield QR detected" : "QR Guard standard code detected",
        "info"
      );
      const qrId = await getQrCodeId(content);
      router.push(`/qr-detail/${qrId}?${param}=${uuid}`);
      // Always emit an event for guard/standard QR scans (these are URLs, treat as safe)
      emitScanEvent(qrId, { platform: _getPlatform(), contentType: "url", verdict: "safe", scanSource });
      setTimeout(() => {
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
          modalControls.openSafetyModal(qrId, check.warnings, check.riskLevel);
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
      if (!canScanRef.current || scanLockRef.current || scanned) return;
      scanLockRef.current = true;
      canScanRef.current  = false;
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await processScan(data, "camera");
    },
    [scanned, anonymousMode, user, token]
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
      return;
    }

    if (result.canceled || !result.assets?.[0]) return;

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
        return;
      }

      await processScan(content, "gallery");
    } catch (e: any) {
      setProcessing(false);
      showGalleryError(e.message || "Something went wrong. Please try again.");
    }
  }

  return { handleBarCodeScanned, handlePickImage };
}
