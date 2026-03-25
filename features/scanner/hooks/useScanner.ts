import { useState, useRef, useCallback, useEffect } from "react";
import { Animated, Easing, Linking, Platform } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "@/lib/haptics";
import { scanFromURLAsync } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAnonymousQrContent } from "@/lib/cache/anonymous-session";
import { useAuth } from "@/contexts/AuthContext";
import {
  getOrCreateQrCode,
  recordScan,
  getGuardLink,
  detectContentType,
  getQrCodeId,
  type GuardLink,
} from "@/lib/firestore-service";

export const FINDER_SIZE = 270;
export const CORNER_SIZE = 32;
export const CORNER_WIDTH = 4;

export const ZOOM_LEVELS = [
  { zoom: 0, label: "1×" },
  { zoom: 0.3, label: "2×" },
  { zoom: 0.6, label: "3×" },
];

const GUARD_PATTERN =
  /\/guard\/([A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4})(?:[/?#]|$)/;

function isInsecureHttpUrl(content: string): boolean {
  return /^http:\/\//i.test(content.trim());
}

/**
 * Decode a QR code entirely in the browser using jsQR + Canvas API.
 * Returns the decoded string, or null if no QR code was found.
 * Only used on web — avoids the CORS/port-routing issues with the API server.
 */
async function decodeQrClientSide(imageUri: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new (window as any).Image() as HTMLImageElement;
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        const scale =
          img.naturalWidth > maxDim || img.naturalHeight > maxDim
            ? maxDim / Math.max(img.naturalWidth, img.naturalHeight)
            : 1;
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const jsQR = (await import("jsqr")).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        resolve(code ? code.data : null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUri;
  });
}

export function useScanner() {
  const { user, token } = useAuth();

  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [zoomLabel, setZoomLabel] = useState("1×");
  const [facing, setFacing] = useState<"back" | "front">("back");

  const [safetyModal, setSafetyModal] = useState(false);
  const [pendingQrId, setPendingQrId] = useState<string | null>(null);
  const [safetyWarnings, setSafetyWarnings] = useState<string[]>([]);
  const [safetyRiskLevel, setSafetyRiskLevel] = useState<"caution" | "dangerous">("caution");

  const [verifiedModal, setVerifiedModal] = useState(false);
  const [verifiedOwnerName, setVerifiedOwnerName] = useState("");
  const [verifiedQrId, setVerifiedQrId] = useState<string | null>(null);
  const [unverifiedModal, setUnverifiedModal] = useState(false);
  const [unverifiedQrId, setUnverifiedQrId] = useState<string | null>(null);
  const [unverifiedCountdown, setUnverifiedCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [livingShieldModal, setLivingShieldModal] = useState(false);
  const [livingShieldData, setLivingShieldData] = useState<GuardLink | null>(null);
  const [livingShieldLoading, setLivingShieldLoading] = useState(false);

  const [galleryErrorMsg, setGalleryErrorMsg] = useState<string | null>(null);
  const [scannerMsg, setScannerMsg] = useState<string | null>(null);
  const [scannerMsgType, setScannerMsgType] = useState<"error" | "warning" | "info">("error");

  const scanLockRef = useRef(false);
  const canScanRef = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLineLoop = useRef<Animated.CompositeAnimation | null>(null);

  function startScanLine() {
    scanLineAnim.setValue(0);
    scanLineLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    scanLineLoop.current.start();
  }

  function stopScanLine() {
    if (scanLineLoop.current) scanLineLoop.current.stop();
  }

  useEffect(() => {
    startScanLine();
    return () => stopScanLine();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setProcessing(false);
      setScanSuccess(false);
      scanLockRef.current = false;
      canScanRef.current = false;
      startScanLine();
      focusTimerRef.current = setTimeout(() => {
        canScanRef.current = true;
      }, 200);
      return () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        canScanRef.current = false;
        stopScanLine();
      };
    }, [])
  );

  function flipCamera() {
    setFacing((prev) => {
      const next = prev === "back" ? "front" : "back";
      // Turn off flash when switching to front camera (no torch on front)
      if (next === "front") setFlashOn(false);
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleLivingShieldProceed() {
    if (!livingShieldData?.currentDestination) return;
    const dest = livingShieldData.currentDestination;
    setLivingShieldModal(false);
    setLivingShieldData(null);
    scanLockRef.current = false;
    setScanned(false);
    await Linking.openURL(dest.startsWith("http") ? dest : `https://${dest}`);
  }

  function handleLivingShieldCancel() {
    setLivingShieldModal(false);
    setLivingShieldData(null);
    scanLockRef.current = false;
    setScanned(false);
    setScanSuccess(false);
  }

  function navigateToQrDetail(qrId: string) {
    setScanSuccess(true);
    router.push(`/qr-detail/${qrId}`);
  }

  // ─── LOCAL-ONLY OFFLINE PATH ──────────────────────────────────────────────────
  // When offline, we skip all network calls. The QR content is analysed locally
  // (content type, safety heuristics) and stored in AsyncStorage so the detail
  // screen can render it without any network dependency.
  async function processOfflineScan(content: string, scanSource: "camera" | "gallery" = "camera") {
    const contentType = detectContentType(content);
    const qrId = await getQrCodeId(content);

    await AsyncStorage.setItem(
      `qr_content_${qrId}`,
      JSON.stringify({ content, contentType })
    ).catch(() => {});

    if (user) {
      const scanEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        content,
        contentType,
        scannedAt: new Date().toISOString(),
        qrCodeId: qrId,
        scanSource,
        offline: true,
      };
      const historyKey = `local_scan_history_${user.id}`;
      try {
        const stored = await AsyncStorage.getItem(historyKey);
        const history = stored ? JSON.parse(stored) : [];
        history.unshift(scanEntry);
        if (history.length > 100) history.pop();
        await AsyncStorage.setItem(historyKey, JSON.stringify(history));
      } catch {}
    }

    setProcessing(false);

    if (contentType === "url" && isInsecureHttpUrl(content)) {
      setPendingQrId(qrId);
      setSafetyRiskLevel("caution");
      setSafetyModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    await navigateToQrDetail(qrId);
  }

  // ─── ANONYMOUS SCAN ───────────────────────────────────────────────────────────
  async function processScanAnonymous(content: string) {
    setProcessing(true);
    try {
      const contentType = detectContentType(content);
      const qrId = await getQrCodeId(content);
      setAnonymousQrContent(qrId, content, contentType);
      setProcessing(false);

      if (contentType === "url" && isInsecureHttpUrl(content)) {
        setPendingQrId(qrId);
        setSafetyRiskLevel("caution");
        setSafetyModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      await navigateToQrDetail(qrId);
    } catch (e: any) {
      setProcessing(false);
      setScanned(false);
      setScanSuccess(false);
      scanLockRef.current = false;
      canScanRef.current = true;
      showScannerMsg(e.message || "Could not process QR code. Please try again.", "error");
    }
  }

  // ─── NORMAL SCAN ─────────────────────────────────────────────────────────────
  async function processScan(
    content: string,
    scanSource: "camera" | "gallery" = "camera"
  ) {
    // Signed-in users who chose anonymous mode: absolute zero tracking
    if (user && anonymousMode) {
      const guardMatch = content.match(GUARD_PATTERN);
      if (guardMatch) {
        const guardUuid = guardMatch[1].toUpperCase();
        setProcessing(false);
        setLivingShieldLoading(true);
        setLivingShieldModal(true);
        setScanSuccess(true);
        try {
          const link = await getGuardLink(guardUuid);
          setLivingShieldData(link);
        } catch {
          setLivingShieldData(null);
        } finally {
          setLivingShieldLoading(false);
        }
        return;
      }
      await processScanAnonymous(content);
      return;
    }

    // Guard links always need a network read (read-only)
    const guardMatch = content.match(GUARD_PATTERN);
    if (guardMatch) {
      const guardUuid = guardMatch[1].toUpperCase();
      setProcessing(false);
      setLivingShieldLoading(true);
      setLivingShieldModal(true);
      setScanSuccess(true);
      try {
        const link = await getGuardLink(guardUuid);
        setLivingShieldData(link);
      } catch {
        setLivingShieldData(null);
      } finally {
        setLivingShieldLoading(false);
      }
      return;
    }

    setProcessing(true);

    // ── Speed-first: compute QR ID locally, cache content, navigate immediately ─
    // Network calls (getOrCreateQrCode, recordScan) run in the background so the
    // user reaches the detail page with zero server round-trip latency.
    try {
      const qrId = await getQrCodeId(content);
      const contentType = detectContentType(content);

      // Cache locally so the detail page renders offline-first instantly
      await AsyncStorage.setItem(
        `qr_content_${qrId}`,
        JSON.stringify({ content, contentType })
      ).catch(() => {});

      setProcessing(false);

      // Safety warning check (local, no network needed)
      if (contentType === "url" && isInsecureHttpUrl(content)) {
        setPendingQrId(qrId);
        setSafetyRiskLevel("caution");
        setSafetyModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        // Still sync in background
        _backgroundSync(content, qrId, contentType, scanSource);
        return;
      }

      // Navigate immediately — detail page shows cached content while Firestore loads
      navigateToQrDetail(qrId);

      // Background: register with Firestore + record scan (non-blocking)
      _backgroundSync(content, qrId, contentType, scanSource);
    } catch (e: any) {
      // Fully offline — use offline path
      await processOfflineScan(content, scanSource);
    }
  }

  // Fire-and-forget background network sync after fast local navigation
  function _backgroundSync(
    content: string,
    localQrId: string,
    contentType: string,
    scanSource: "camera" | "gallery"
  ) {
    (async () => {
      try {
        const qr = await getOrCreateQrCode(content);
        // Update cache with Firestore's canonical data
        await AsyncStorage.setItem(
          `qr_content_${qr.id}`,
          JSON.stringify({ content: qr.content, contentType: qr.contentType })
        ).catch(() => {});
        recordScan(qr.id, content, qr.contentType, user?.id || null, false, scanSource).catch(() => {});
        if (user) {
          const scanEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content,
            contentType: qr.contentType,
            scannedAt: new Date().toISOString(),
            qrCodeId: qr.id,
            scanSource,
          };
          const historyKey = `local_scan_history_${user.id}`;
          try {
            const stored = await AsyncStorage.getItem(historyKey);
            const history = stored ? JSON.parse(stored) : [];
            history.unshift(scanEntry);
            if (history.length > 100) history.pop();
            await AsyncStorage.setItem(historyKey, JSON.stringify(history));
          } catch {}
        }
      } catch {}
    })();
  }

  useEffect(() => {
    if (!verifiedModal) return;
    const t = setTimeout(() => {
      setVerifiedModal(false);
      if (verifiedQrId) router.push(`/qr-detail/${verifiedQrId}`);
    }, 2200);
    return () => clearTimeout(t);
  }, [verifiedModal, verifiedQrId]);

  useEffect(() => {
    if (!unverifiedModal) return;
    setUnverifiedCountdown(3);
    countdownRef.current = setInterval(() => {
      setUnverifiedCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          setUnverifiedModal(false);
          if (unverifiedQrId) router.push(`/qr-detail/${unverifiedQrId}`);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [unverifiedModal, unverifiedQrId]);

  function handleUnverifiedProceed() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setUnverifiedModal(false);
    if (unverifiedQrId) router.push(`/qr-detail/${unverifiedQrId}`);
  }

  function handleUnverifiedBack() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setUnverifiedModal(false);
    setUnverifiedQrId(null);
    setScanned(false);
    setProcessing(false);
    setScanSuccess(false);
    scanLockRef.current = false;
    canScanRef.current = true;
  }

  function handleSafetyModalProceed() {
    if (!pendingQrId) return;
    setSafetyModal(false);
    setScanSuccess(true);
    router.push(`/qr-detail/${pendingQrId}`);
  }

  function handleSafetyModalBack() {
    setSafetyModal(false);
    setPendingQrId(null);
    setSafetyWarnings([]);
    setScanned(false);
    setProcessing(false);
    setScanSuccess(false);
    scanLockRef.current = false;
    canScanRef.current = true;
  }

  function showGalleryError(msg: string) {
    setGalleryErrorMsg(msg);
  }

  function dismissGalleryError() {
    setGalleryErrorMsg(null);
  }

  function showScannerMsg(msg: string, type: "error" | "warning" | "info" = "error") {
    setScannerMsg(msg);
    setScannerMsgType(type);
  }

  function dismissScannerMsg() {
    setScannerMsg(null);
  }

  async function handlePickImage() {
    if (!token) {
      showScannerMsg("Sign in to scan QR codes from your gallery.", "info");
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
    } catch {
      showGalleryError("Could not open your gallery. Please try again.");
      return;
    }

    if (result.canceled || !result.assets?.[0]) return;

    setProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // ── Decode the QR code locally on-device (no server upload needed)
    try {
      let content: string | null = null;
      const uri = result.assets[0].uri;

      if (Platform.OS === "web") {
        // On web, decode client-side with jsQR + Canvas API.
        content = await decodeQrClientSide(uri);
      } else {
        // On native (Android/iOS), decode locally using expo-camera's
        // scanFromURLAsync — reads the QR directly from the file URI without
        // uploading anything to a server.
        const results = await scanFromURLAsync(uri, ["qr"]);
        content = results?.[0]?.data ?? null;
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

  function cycleZoom() {
    const currentIdx = ZOOM_LEVELS.findIndex((z) => z.zoom === zoom);
    const next = ZOOM_LEVELS[(currentIdx + 1) % ZOOM_LEVELS.length];
    setZoom(next.zoom);
    setZoomLabel(next.label);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!canScanRef.current || scanLockRef.current || scanned) return;
      scanLockRef.current = true;
      canScanRef.current = false;
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await processScan(data, "camera");
    },
    [scanned, anonymousMode, user, token]
  );

  function resetScan() {
    setScanned(false);
    setScanSuccess(false);
    setProcessing(false);
    scanLockRef.current = false;
    canScanRef.current = true;
  }

  return {
    user,
    scanned,
    processing,
    scanSuccess,
    anonymousMode,
    setAnonymousMode,
    flashOn,
    setFlashOn,
    zoom,
    zoomLabel,
    facing,
    flipCamera,
    safetyModal,
    safetyWarnings,
    safetyRiskLevel,
    verifiedModal,
    verifiedOwnerName,
    unverifiedModal,
    unverifiedCountdown,
    livingShieldModal,
    livingShieldData,
    livingShieldLoading,
    scanLineAnim,
    galleryErrorMsg,
    dismissGalleryError,
    scannerMsg,
    scannerMsgType,
    dismissScannerMsg,
    handleBarCodeScanned,
    handlePickImage,
    cycleZoom,
    resetScan,
    handleSafetyModalProceed,
    handleSafetyModalBack,
    handleUnverifiedProceed,
    handleUnverifiedBack,
    handleLivingShieldProceed,
    handleLivingShieldCancel,
  };
}
