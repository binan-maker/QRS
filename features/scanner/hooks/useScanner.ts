import { useState, useRef, useCallback, useEffect } from "react";
import { Alert, Animated, Easing, Linking } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Network from "expo-network";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAnonymousQrContent } from "@/lib/cache/anonymous-session";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import {
  getOrCreateQrCode,
  recordScan,
  getGuardLink,
  detectContentType,
  getQrCodeId,
  type GuardLink,
} from "@/lib/firestore-service";
import { verifyQrSignature } from "@/lib/qr-analysis";

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

async function checkIsOffline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    // isInternetReachable can be null on web — null means "can't tell", not "offline".
    // Only treat as offline when explicitly false.
    return state.isConnected === false || state.isInternetReachable === false;
  } catch {
    return false;
  }
}

function postJsonXhr(
  url: string,
  body: object,
  headers: Record<string, string>
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () => {
      try {
        resolve({ status: xhr.status, data: JSON.parse(xhr.responseText) });
      } catch {
        reject(new Error("Invalid server response"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error — could not reach server"));
    xhr.ontimeout = () => reject(new Error("Request timed out"));
    xhr.timeout = 30000;
    xhr.send(JSON.stringify(body));
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
      }, 500);
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

  async function navigateToQrDetail(qrId: string) {
    setScanSuccess(true);
    await new Promise((r) => setTimeout(r, 300));
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
      Alert.alert("Scan Failed", e.message || "Could not process QR code.", [
        {
          text: "OK",
          onPress: () => {
            setScanned(false);
            setProcessing(false);
            setScanSuccess(false);
            scanLockRef.current = false;
            canScanRef.current = true;
          },
        },
      ]);
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

    // ── Offline-first check: skip Firestore entirely when there's no network ──
    setProcessing(true);
    const offline = await checkIsOffline();
    if (offline) {
      await processOfflineScan(content, scanSource);
      return;
    }

    // ── Online path ──────────────────────────────────────────────────────────
    try {
      const qr = await getOrCreateQrCode(content);
      await AsyncStorage.setItem(
        `qr_content_${qr.id}`,
        JSON.stringify({ content: qr.content, contentType: qr.contentType })
      );
      await recordScan(
        qr.id,
        content,
        qr.contentType,
        user?.id || null,
        false,
        scanSource
      ).catch(() => {});

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
        const stored = await AsyncStorage.getItem(historyKey);
        const history = stored ? JSON.parse(stored) : [];
        history.unshift(scanEntry);
        if (history.length > 100) history.pop();
        await AsyncStorage.setItem(historyKey, JSON.stringify(history));
      }

      setProcessing(false);

      if (qr.contentType === "url" && isInsecureHttpUrl(content)) {
        setPendingQrId(qr.id);
        setSafetyRiskLevel("caution");
        setSafetyModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      if (qr.isBranded && qr.signature && qr.ownerId) {
        const isVerified = await verifyQrSignature(content, qr.ownerId, qr.signature);
        if (isVerified) {
          setVerifiedOwnerName(qr.ownerName || "Verified Owner");
          setVerifiedQrId(qr.id);
          setVerifiedModal(true);
          setScanSuccess(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          await navigateToQrDetail(qr.id);
        }
      } else {
        await navigateToQrDetail(qr.id);
      }
    } catch (e: any) {
      // Network failed mid-scan — fall back to offline path
      await processOfflineScan(content, scanSource);
    }
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

  async function handlePickImage() {
    if (!token) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to scan QR codes from your gallery.",
        [{ text: "OK" }]
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      setProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let base64 = result.assets[0].base64;
      if (!base64 && result.assets[0].uri) {
        base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      if (!base64) {
        showGalleryError("Could not read the selected image");
        setProcessing(false);
        return;
      }
      const baseUrl = getApiUrl();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const { status, data } = await postJsonXhr(
        `${baseUrl}api/qr/decode-image`,
        { imageBase64: base64 },
        headers
      );
      if (status === 404 || !data?.content) {
        showGalleryError(data?.message || "No QR code detected — try a clearer image");
        setProcessing(false);
        return;
      }
      if (status !== 200) {
        showGalleryError(data?.message || "Could not process the image");
        setProcessing(false);
        return;
      }
      await processScan(data.content, "gallery");
    } catch (e: any) {
      showGalleryError(e.message || "Failed to process image");
      setProcessing(false);
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
