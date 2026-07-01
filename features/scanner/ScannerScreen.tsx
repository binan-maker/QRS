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
  const cameraReadyTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraActivateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── useIsFocused — the single source of truth for focus state ─────────────
  const isFocused = useIsFocused();

  // ── cameraActive: delayed mount gate ──────────────────────────────────────
  // DO NOT mount CameraView the instant isFocused becomes true.
  // The screen-transition animation is still running at that point and the
  // camera renders before its container has settled dimensions, producing the
  // "half-black / half-camera" split. A short delay lets the layout settle
  // before the CameraView tries to fill it.
  const [cameraActive, setCameraActive] = useState(false);

  // ── focusKey: increment each focus cycle to force a clean remount ─────────
  // Without this, the CameraView reuses its previous native instance across
  // focus cycles and can carry over a stale, partially-rendered preview.
  const focusCountRef = useRef(0);
  const [focusKey, setFocusKey] = useState(0);

  useEffect(() => {
    if (cameraActivateTimerRef.current) {
      clearTimeout(cameraActivateTimerRef.current);
      cameraActivateTimerRef.current = null;
    }

    if (isFocused) {
      // 180 ms gives the stack-navigator slide animation time to finish
      // before the native camera surface requests its first frame.
      const delay = Platform.OS === "android" ? 250 : 180;
      cameraActivateTimerRef.current = setTimeout(() => {
        focusCountRef.current += 1;
        setFocusKey(focusCountRef.current);
        setCameraActive(true);
      }, delay);
    } else {
      setCameraActive(false);
    }

    return () => {
      if (cameraActivateTimerRef.current) {
        clearTimeout(cameraActivateTimerRef.current);
        cameraActivateTimerRef.current = null;
      }
    };
  }, [isFocused]);

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
  // isAvailableAsync() is NOT reliable on many Android ROMs — it can return
  // false or throw on devices that have a perfectly working camera. We use it
  // as a *hint*, not a hard gate. When it returns false or errors we still
  // attempt to mount the camera and let onMountError / the watchdog be the
  // authoritative failure signal.
  useEffect(() => {
    let cancelled = false;
    CameraView.isAvailableAsync()
      .then((available) => { if (!cancelled) setHardwareAvailable(available); })
      .catch(() => {
        // API error means "unknown" — optimistically assume true so the camera
        // gets a chance to mount. onMountError will catch genuine failures.
        if (!cancelled) setHardwareAvailable(true);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Camera ready watchdog ──────────────────────────────────────────────────
  // Restarts whenever cameraActive changes so each mount gets its own window.
  // We start the watchdog even when hardwareAvailable is false — isAvailableAsync()
  // returns incorrect results on many Android ROMs, so we let the mount attempt
  // (and onMountError / onCameraReady) be the authoritative outcome.
  // When hardwareAvailable is false we use a shorter window (5 s) because a device
  // that truly has no camera triggers onMountError almost immediately, so a long
  // wait would just delay the error message needlessly.
  useEffect(() => {
    if (!permission?.granted || hardwareAvailable === null || !cameraActive) return;

    const timeoutMs =
      hardwareAvailable === false
        ? 5000                                     // likely no camera — fail fast
        : Platform.OS === "android" ? 15000 : 12000; // real device — give plenty of time

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
  }, [permission?.granted, hardwareAvailable, cameraActive]);

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
    // Force a full remount with a fresh key
    focusCountRef.current += 1;
    setFocusKey(focusCountRef.current);
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
    handleUnverifiedProceed,
    handleUnverifiedBack,
  } = useScanner({ isCameraAvailable: cameraAvailable });

  // ── Barcode handler — always stable, refs gate double-scans ───────────────
  // IMPORTANT: never pass `undefined` to onBarcodeScanned. Switching between
  // a function and undefined causes CameraView to re-render its native surface,
  // which is the primary trigger of the half-black screen artifact.
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

  // ── Camera live: fully active, layout settled, and camera responding ────────
  // hardwareAvailable === false no longer blocks mounting — isAvailableAsync()
  // is unreliable on many Android ROMs. cameraAvailable (driven by onCameraReady /
  // onMountError / the watchdog) is the authoritative signal.
  const cameraLive = cameraActive && hardwareAvailable !== null && cameraAvailable;

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" backgroundColor="transparent" translucent />

      {/* Camera layer — black placeholder holds space during all non-camera states */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]} />

      {hardwareAvailable === null ? (
        // Still waiting for isAvailableAsync() — black placeholder holds space
        null
      ) : !cameraAvailable && isFocused ? (
        // Camera failed (onMountError fired or watchdog expired) — show recovery UI
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#080c14" }]}>
          <View style={{ paddingTop: topInset + 8, paddingHorizontal: 16, paddingBottom: 10 }}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <CameraUnavailableBanner
              onPickImage={handlePickImage}
              onRetry={handleCameraRetry}
              errorType={cameraErrorType}
            />
          </View>
        </View>
      ) : cameraActive ? (
        // Camera active — layout has settled, attempt mount.
        // isAvailableAsync() returning false is treated as a hint only; onMountError
        // is the authoritative signal for devices that genuinely lack a camera.
        <CameraErrorBoundary onError={() => markCameraUnavailable("unavailable")}>
          <CameraView
            key={focusKey}
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            enableTorch={flashOn && facing === "back"}
            zoom={zoom}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleScanWithCount}
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
      ) : null}

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
