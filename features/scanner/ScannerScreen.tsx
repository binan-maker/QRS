import { useRef, useEffect, useState, useCallback } from "react";
import { Platform, View, StyleSheet, Pressable } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useTopInset } from "@/shared/utils/platform";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScanner } from "@/features/scanner/hooks/useScanner";
import {
  ScannerOverlay,
  ProcessingOverlay,
  SafetyModal,
  VerifiedModal,
  PermissionScreen,
  CameraErrorBoundary,
  ScannerToast,
  toastContainerStyle,
  CameraUnavailableBanner,
  UnverifiedModal,
  DonationBanner,
  ConversionBanner,
} from "@/features/scanner/components";
import type { CameraErrorType } from "@/features/scanner/components";

const DONATION_DISMISS_KEY = "@qrg_donation_dismissed";
const SCAN_COUNT_KEY       = "@qrg_total_scan_count";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [hardwareAvailable, setHardwareAvailable] = useState<boolean | null>(null);
  const [cameraAvailable,   setCameraAvailable]   = useState(true);
  const [cameraErrorType,   setCameraErrorType]   = useState<CameraErrorType>("unavailable");
  const cameraReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── useIsFocused — the single source of truth for camera mount/unmount ──────
  // When the screen loses focus (user navigates to QR detail, profile, etc.),
  // isFocused → false and CameraView unmounts, giving Android time to release
  // the hardware cleanly. When focus returns, CameraView mounts fresh.
  // This is the standard fix for "black screen on return" in React Native Camera.
  const isFocused = useIsFocused();

  // Reset error state every time the screen comes back into view
  useFocusEffect(
    useCallback(() => {
      setCameraAvailable(true);
    }, [])
  );

  const insets      = useSafeAreaInsets();
  const { colors }  = useTheme();
  const topInset    = useTopInset();
  const bottomInset = Math.max(insets.bottom, 24);

  const [showDonationBanner, setShowDonationBanner] = useState(false);

  // ── Donation banner: show after 5 total scans ──────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(DONATION_DISMISS_KEY).then((dismissed) => {
      if (dismissed) return;
      AsyncStorage.getItem(SCAN_COUNT_KEY).then((c) => {
        if (parseInt(c || "0", 10) >= 5) setShowDonationBanner(true);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // ── Hardware availability check ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (Platform.OS === "android") {
      setHardwareAvailable(true);
      return () => { cancelled = true; };
    }
    CameraView.isAvailableAsync()
      .then((available) => { if (!cancelled) setHardwareAvailable(available); })
      .catch(() => { if (!cancelled) setHardwareAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Camera ready watchdog ──────────────────────────────────────────────────
  // Restarts on every focus cycle (isFocused in deps) so each fresh camera
  // mount gets its own window to call onCameraReady.
  useEffect(() => {
    if (!permission?.granted || hardwareAvailable !== true || !isFocused) return;

    const timeoutMs = Platform.OS === "android" ? 25000 : 12000;
    cameraReadyTimerRef.current = setTimeout(() => {
      setCameraAvailable((prev) => {
        if (prev) setCameraErrorType("unavailable");
        return false;
      });
    }, timeoutMs);

    return () => {
      if (cameraReadyTimerRef.current) {
        clearTimeout(cameraReadyTimerRef.current);
        cameraReadyTimerRef.current = null;
      }
    };
  }, [permission?.granted, hardwareAvailable, isFocused]);

  function markCameraUnavailable(type: CameraErrorType) {
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    setCameraErrorType(type);
    setCameraAvailable(false);
  }

  function markCameraReady() {
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
  }

  function handleCameraRetry() {
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    setCameraAvailable(true);
    setCameraErrorType("unavailable");
  }

  // ── Scanner hook ──────────────────────────────────────────────────────────
  const {
    user,
    scanned,
    processing,
    scanSuccess,
    anonymousMode,
    setAnonymousMode,
    flashOn,
    toggleFlash,
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
    scanLineAnim,
    galleryErrorMsg,
    dismissGalleryError,
    scannerMsg,
    scannerMsgType,
    dismissScannerMsg,
    conversionBannerMsg,
    dismissConversionBanner,
    handleBarCodeScanned,
    handlePickImage,
    cycleZoom,
    resetScan,
    handleSafetyModalProceed,
    handleSafetyModalBack,
    handleUnverifiedProceed,
    handleUnverifiedBack,
  } = useScanner();

  // Track scan count for donation banner (does not affect scan logic)
  const handleScanWithCount = useCallback(async (data: any) => {
    handleBarCodeScanned(data);
    try {
      const dismissed = await AsyncStorage.getItem(DONATION_DISMISS_KEY);
      if (dismissed) return;
      const stored   = await AsyncStorage.getItem(SCAN_COUNT_KEY);
      const newCount = parseInt(stored || "0", 10) + 1;
      await AsyncStorage.setItem(SCAN_COUNT_KEY, String(newCount));
      if (newCount >= 5) setShowDonationBanner(true);
    } catch {}
  }, [handleBarCodeScanned]);

  // ── Permission not yet resolved ────────────────────────────────────────────
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={colors.isDark ? "light" : "dark"} />
        <PermissionScreen
          canAskAgain={permission.canAskAgain}
          onRequestPermission={requestPermission}
        />
        {scannerMsg && (
          <View style={[toastContainerStyle, { bottom: 32 }]}>
            <ScannerToast message={scannerMsg} type={scannerMsgType} onDone={dismissScannerMsg} />
          </View>
        )}
      </View>
    );
  }

  // ── Camera active: only when screen is focused ─────────────────────────────
  const cameraLive = isFocused && hardwareAvailable === true && cameraAvailable;

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" backgroundColor="transparent" translucent />

      {/* Camera — only mounted while this screen is focused */}
      {hardwareAvailable === null ? (
        // Still checking hardware
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]} />
      ) : hardwareAvailable === false || (!cameraAvailable && isFocused) ? (
        // Hardware unavailable or camera error
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#080c14" }]}>
          <View style={{ paddingTop: topInset + 8, paddingHorizontal: 16, paddingBottom: 10 }}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <CameraUnavailableBanner
              onPickImage={handlePickImage}
              onRetry={handleCameraRetry}
              errorType={cameraErrorType}
            />
          </View>
        </View>
      ) : isFocused ? (
        // Camera live — only rendered when screen is focused
        <CameraErrorBoundary onError={() => markCameraUnavailable("unavailable")}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            enableTorch={flashOn && facing === "back"}
            zoom={zoom}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleScanWithCount}
            onCameraReady={markCameraReady}
            onMountError={(error) => {
              const msg     = (error?.message ?? "").toLowerCase();
              const isInUse =
                msg.includes("in use")      ||
                msg.includes("busy")        ||
                msg.includes("already")     ||
                msg.includes("another app") ||
                msg.includes("restricted");
              markCameraUnavailable(isInUse ? "inuse" : "unavailable");
            }}
          />
        </CameraErrorBoundary>
      ) : (
        // Screen not focused — render black background, camera unmounted
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]} />
      )}

      {/* Scanner overlay (controls, finder, animations) */}
      {cameraLive && (
        <ScannerOverlay
          topInset={topInset}
          bottomInset={bottomInset}
          flashOn={flashOn}
          onToggleFlash={toggleFlash}
          zoom={zoom}
          zoomLabel={zoomLabel}
          onCycleZoom={cycleZoom}
          scanned={scanned}
          scanSuccess={scanSuccess}
          scanLineAnim={scanLineAnim}
          anonymousMode={anonymousMode}
          onToggleAnonymous={() => setAnonymousMode(!anonymousMode)}
          onPickImage={handlePickImage}
          onReset={resetScan}
          user={user}
          facing={facing}
          onFlipCamera={flipCamera}
        />
      )}

      {/* Processing overlay — lazy-mounted */}
      {processing && <ProcessingOverlay />}

      {/* Modals — lazy-mounted (only rendered when open) */}
      {safetyModal && (
        <SafetyModal
          visible={safetyModal}
          warnings={safetyWarnings}
          riskLevel={safetyRiskLevel}
          onProceed={handleSafetyModalProceed}
          onBack={handleSafetyModalBack}
        />
      )}

      {verifiedModal && (
        <VerifiedModal visible={verifiedModal} ownerName={verifiedOwnerName} />
      )}

      {unverifiedModal && (
        <UnverifiedModal
          visible={unverifiedModal}
          countdown={unverifiedCountdown}
          onProceed={handleUnverifiedProceed}
          onBack={handleUnverifiedBack}
        />
      )}

      <DonationBanner
        visible={showDonationBanner}
        bottomOffset={bottomInset + (conversionBannerMsg && !user ? 106 : 16)}
        onDismiss={async () => {
          setShowDonationBanner(false);
          try { await AsyncStorage.setItem(DONATION_DISMISS_KEY, "1"); } catch {}
        }}
      />

      <ConversionBanner
        message={conversionBannerMsg}
        visible={!user && !!conversionBannerMsg}
        bottomOffset={bottomInset + 16}
        onSignIn={() => { dismissConversionBanner(); router.push("/(auth)/login"); }}
        onDismiss={dismissConversionBanner}
      />

      {galleryErrorMsg && (
        <View style={[toastContainerStyle, { bottom: bottomInset + (conversionBannerMsg ? 96 : 16) }]}>
          <ScannerToast message={galleryErrorMsg} type="error" onDone={dismissGalleryError} />
        </View>
      )}

      {scannerMsg && !galleryErrorMsg && (
        <View style={[toastContainerStyle, { bottom: bottomInset + 16 }]}>
          <ScannerToast message={scannerMsg} type={scannerMsgType} onDone={dismissScannerMsg} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.1)",
  },
});
