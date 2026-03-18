import { useState, useRef, useCallback, useEffect } from "react";
import { Alert, Animated, Easing, Linking } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { getOrCreateQrCode, recordScan, getGuardLink, type GuardLink } from "@/lib/firestore-service";
import {
  parseAnyPaymentQr,
  analyzeAnyPaymentQr,
  analyzeUrlHeuristics,
  loadOfflineBlacklist,
  checkOfflineBlacklist,
  verifyQrSignature,
} from "@/lib/qr-analysis";

export const FINDER_SIZE = 270;
export const CORNER_SIZE = 32;
export const CORNER_WIDTH = 4;

export const ZOOM_LEVELS = [
  { zoom: 0, label: "1×" },
  { zoom: 0.3, label: "2×" },
  { zoom: 0.6, label: "3×" },
];

const GUARD_PATTERN = /\/guard\/([A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4})(?:[/?#]|$)/;

export function useScanner() {
  const { user, token } = useAuth();

  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [zoomLabel, setZoomLabel] = useState("1×");

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

  const scanLockRef = useRef(false);
  const canScanRef = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLineLoop = useRef<Animated.CompositeAnimation | null>(null);

  function startScanLine() {
    scanLineAnim.setValue(0);
    scanLineLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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
      focusTimerRef.current = setTimeout(() => { canScanRef.current = true; }, 500);
      return () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        canScanRef.current = false;
        stopScanLine();
      };
    }, [])
  );

  async function runSafetyCheck(content: string, contentType: string): Promise<{ riskLevel: "safe" | "caution" | "dangerous"; warnings: string[] }> {
    const warnings: string[] = [];
    let riskLevel: "safe" | "caution" | "dangerous" = "safe";
    const blacklist = await loadOfflineBlacklist();
    const blMatch = checkOfflineBlacklist(content, blacklist);
    if (blMatch.matched) {
      warnings.push(`Known scam pattern: ${blMatch.reason}`);
      riskLevel = "dangerous";
    }
    if (contentType === "payment") {
      const parsed = parseAnyPaymentQr(content);
      if (parsed) {
        const result = analyzeAnyPaymentQr(parsed);
        warnings.push(...result.warnings);
        if (result.riskLevel === "dangerous") riskLevel = "dangerous";
        else if (result.riskLevel === "caution" && riskLevel === "safe") riskLevel = "caution";
      }
    }
    if (contentType === "url") {
      try {
        const result = analyzeUrlHeuristics(content);
        warnings.push(...result.warnings);
        if (result.riskLevel === "dangerous") riskLevel = "dangerous";
        else if (result.riskLevel === "caution" && riskLevel === "safe") riskLevel = "caution";
      } catch {}
    }
    return { riskLevel, warnings };
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

  async function processScan(content: string) {
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
    try {
      const qr = await getOrCreateQrCode(content);
      await AsyncStorage.setItem(`qr_content_${qr.id}`, JSON.stringify({ content: qr.content, contentType: qr.contentType }));
      await recordScan(qr.id, content, qr.contentType, user?.id || null, anonymousMode).catch(() => {});

      if (!anonymousMode && user) {
        const scanEntry = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          content,
          contentType: qr.contentType,
          scannedAt: new Date().toISOString(),
          qrCodeId: qr.id,
        };
        const historyKey = `local_scan_history_${user.id}`;
        const stored = await AsyncStorage.getItem(historyKey);
        const history = stored ? JSON.parse(stored) : [];
        history.unshift(scanEntry);
        if (history.length > 100) history.pop();
        await AsyncStorage.setItem(historyKey, JSON.stringify(history));
      }

      setProcessing(false);
      const { riskLevel, warnings } = await runSafetyCheck(content, qr.contentType);

      if (riskLevel !== "safe" && warnings.length > 0) {
        setPendingQrId(qr.id);
        setSafetyWarnings(warnings);
        setSafetyRiskLevel(riskLevel as "caution" | "dangerous");
        setSafetyModal(true);
        Haptics.notificationAsync(
          riskLevel === "dangerous" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Warning
        );
      } else {
        if (qr.isBranded && qr.signature && qr.ownerId) {
          const isVerified = await verifyQrSignature(content, qr.ownerId, qr.signature);
          if (isVerified) {
            setVerifiedOwnerName(qr.ownerName || "Verified Owner");
            setVerifiedQrId(qr.id);
            setVerifiedModal(true);
            setScanSuccess(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            setPendingQrId(qr.id);
            setSafetyWarnings(["QR signature mismatch — this QR may have been tampered with or cloned"]);
            setSafetyRiskLevel("caution");
            setSafetyModal(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        } else {
          setScanSuccess(true);
          await new Promise((r) => setTimeout(r, 300));
          router.push(`/qr-detail/${qr.id}`);
        }
      }
    } catch (e: any) {
      try {
        const { detectContentType, getQrCodeId } = await import("@/lib/firestore-service");
        const contentType = detectContentType(content);
        const qrId = await getQrCodeId(content);
        await AsyncStorage.setItem(`qr_content_${qrId}`, JSON.stringify({ content, contentType }));
        setProcessing(false);
        const { riskLevel, warnings } = await runSafetyCheck(content, contentType);
        if (riskLevel !== "safe" && warnings.length > 0) {
          setPendingQrId(qrId);
          setSafetyWarnings(warnings);
          setSafetyRiskLevel(riskLevel as "caution" | "dangerous");
          setSafetyModal(true);
        } else {
          setScanSuccess(true);
          await new Promise((r) => setTimeout(r, 300));
          router.push(`/qr-detail/${qrId}`);
        }
        return;
      } catch {}
      Alert.alert("Scan Failed", e.message || "Could not process QR code. Please try again.", [
        { text: "OK", onPress: () => {
          setScanned(false); setProcessing(false); setScanSuccess(false);
          scanLockRef.current = false; canScanRef.current = true;
        }},
      ]);
    } finally {
      setProcessing(false);
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
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
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

  async function handlePickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, base64: true });
      if (result.canceled || !result.assets[0]) return;
      setProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let base64 = result.assets[0].base64;
      if (!base64 && result.assets[0].uri) {
        base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
      }
      if (!base64) { Alert.alert("Error", "Could not read image"); setProcessing(false); return; }
      const baseUrl = getApiUrl();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await globalThis.fetch(`${baseUrl}api/qr/decode-image`, {
        method: "POST", headers, body: JSON.stringify({ imageBase64: base64 }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        Alert.alert("No QR Found", "No QR code was detected in the selected image");
        setProcessing(false);
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.content) {
        Alert.alert("No QR Found", data.message || "No QR code was detected in the selected image");
        setProcessing(false);
        return;
      }
      await processScan(data.content);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to process image");
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
      await processScan(data);
    },
    [scanned, anonymousMode, token]
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
