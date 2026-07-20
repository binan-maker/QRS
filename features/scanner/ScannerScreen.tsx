import { useRef, useEffect, useState, useCallback } from "react";
import { Platform, View, StyleSheet, Pressable, Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// NOTE: react-native-reanimated is intentionally NOT imported here.
// A FadeIn entry animation on the root view makes it transparent at mount,
// which lets the navigation stack's dark-blue background bleed through and
// causes the "blue screen on scanner entry" bug on iOS.
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

// iOS uses continuous autofocus natively ('on' = AVCaptureFocusModeContinuousAutoFocus).
// Android's CameraX default is already continuous — setting 'on' there triggers
// single-shot AF then locks, which is worse. So we only set it explicitly on iOS.
const AUTOFOCUS_MODE = Platform.OS === "ios" ? "on" as const : undefined;

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [hardwareAvailable, setHardwareAvailable] = useState<boolean | null>(null);
  const [cameraAvailable,   setCameraAvailable]   = useState(true);
  const [cameraErrorType,   setCameraErrorType]   = useState<CameraErrorType>("unavailable");
  const cameraAvailableRef     = useRef(true);
  const cameraReadyTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraActivateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── cameraPreviewReady: true only after onCameraReady fires ───────────────
  const [cameraPreviewReady, setCameraPreviewReady] = useState(false);

  const isFocused = useIsFocused();

  // ── cameraActive: delayed mount gate ──────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false);

  const focusCountRef = useRef(0);
  const [focusKey, setFocusKey] = useState(0);

  useEffect(() => {
    if (cameraActivateTimerRef.current) {
      clearTimeout(cameraActivateTimerRef.current);
      cameraActivateTimerRef.current = null;
    }

    if (isFocused) {
      const delay = Platform.OS === "ios" ? 900 : 300;
      cameraActivateTimerRef.current = setTimeout(() => {
        focusCountRef.current += 1;
        setFocusKey(focusCountRef.current);
        setCameraPreviewReady(false);
        setCameraActive(true);
      }, delay);
    } else {
      setCameraActive(false);
      setCameraPreviewReady(false);
    }

    return () => {
      if (cameraActivateTimerRef.current) {
        clearTimeout(cameraActivateTimerRef.current);
        cameraActivateTimerRef.current = null;
      }
    };
  }, [isFocused]);

  useEffect(() => { cameraAvailableRef.current = cameraAvailable; }, [cameraAvailable]);

  useFocusEffect(
    useCallback(() => {
      cameraAvailableRef.current = true;
      setCameraAvailable(true);
    }, [])
  );

  const insets      = useSafeAreaInsets();
  const { colors }  = useTheme();
  const topInset    = useTopInset();
  const bottomInset = Math.max(insets.bottom, 24);

  const [showDonationBanner, setShowDonationBanner] = useState(false);

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
    const timeout = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(true), 3000)
    );
    Promise.race([CameraView.isAvailableAsync(), timeout])
      .then((available) => { if (!cancelled) setHardwareAvailable(available); })
      .catch(() => { if (!cancelled) setHardwareAvailable(true); });
    return () => { cancelled = true; };
  }, []);

  // ── Camera ready watchdog ──────────────────────────────────────────────────
  useEffect(() => {
    if (!permission?.granted || hardwareAvailable === null || !cameraActive) return;

    const timeoutMs =
      hardwareAvailable === false
        ? 5000
        : Platform.OS === "android" ? 15000 : 12000;

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
  }, [permission?.granted, hardwareAvailable, cameraActive, focusKey]);

  function markCameraUnavailable(type: CameraErrorType) {
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    if (cameraPreviewSafetyRef.current) {
      clearTimeout(cameraPreviewSafetyRef.current);
      cameraPreviewSafetyRef.current = null;
    }
    cameraAvailableRef.current = false;
    setCameraErrorType(type);
    setCameraAvailable(false);
  }

  // ── Safety net: lift the black cover if onCameraReady never fires ──────────
  const cameraPreviewSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cameraPreviewSafetyRef.current) {
      clearTimeout(cameraPreviewSafetyRef.current);
      cameraPreviewSafetyRef.current = null;
    }
    if (cameraActive && !cameraPreviewReady) {
      cameraPreviewSafetyRef.current = setTimeout(() => {
        if (!cameraAvailableRef.current) return;
        setCameraPreviewReady((prev) => (prev ? prev : true));
      }, 5000);
    }
    return () => {
      if (cameraPreviewSafetyRef.current) {
        clearTimeout(cameraPreviewSafetyRef.current);
        cameraPreviewSafetyRef.current = null;
      }
    };
  }, [cameraActive, cameraPreviewReady]);

  function markCameraReady() {
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    if (cameraPreviewSafetyRef.current) {
      clearTimeout(cameraPreviewSafetyRef.current);
      cameraPreviewSafetyRef.current = null;
    }
    setCameraPreviewReady(true);
  }

  function handleCameraRetry() {
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    if (cameraPreviewSafetyRef.current) {
      clearTimeout(cameraPreviewSafetyRef.current);
      cameraPreviewSafetyRef.current = null;
    }
    focusCountRef.current += 1;
    setFocusKey(focusCountRef.current);
    setCameraPreviewReady(false);
    cameraAvailableRef.current = true;
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
    onQRBoundsDetected,
  } = useScanner({ isCameraAvailable: cameraAvailable });

  // ── Barcode handler — wires smart zoom before processing ─────────────────
  // onQRBoundsDetected inspects bounds.size.width to detect small QR codes
  // and automatically boosts zoom for faster, more reliable detection.
  const handleScanWithCount = useCallback(async (data: any) => {
    // Feed bounds into smart auto-zoom before the scan lock fires
    onQRBoundsDetected(data?.bounds);
    handleBarCodeScanned(data);
    try {
      const dismissed = await AsyncStorage.getItem(DONATION_DISMISS_KEY);
      if (dismissed) return;
      const stored   = await AsyncStorage.getItem(SCAN_COUNT_KEY);
      const newCount = parseInt(stored || "0", 10) + 1;
      await AsyncStorage.setItem(SCAN_COUNT_KEY, String(newCount));
      if (newCount >= 5) setShowDonationBanner(true);
    } catch {}
  }, [handleBarCodeScanned, onQRBoundsDetected]);

  // ── Tap-to-focus ──────────────────────────────────────────────────────────
  // Shows a brief focus ring at the tap point. Continuous autofocus keeps
  // running; the visual ring confirms to the user that they tapped.
  // On iOS, toggling autofocus from 'on'→'off'→'on' restarts the AF cycle.
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const focusRingAnim    = useRef(new Animated.Value(0)).current;
  const focusRingTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autofocusMode, setAutofocusMode] = useState<"on" | "off" | undefined>(AUTOFOCUS_MODE);

  const handleTapFocus = useCallback((x: number, y: number) => {
    if (!cameraLive || scanned) return;

    // Show the focus ring
    if (focusRingTimer.current) clearTimeout(focusRingTimer.current);
    setFocusPoint({ x, y });
    focusRingAnim.stopAnimation();
    focusRingAnim.setValue(0);

    Animated.sequence([
      Animated.timing(focusRingAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(focusRingAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setFocusPoint(null));

    // iOS: briefly toggle autofocus to trigger a new AF metering cycle
    if (Platform.OS === "ios") {
      setAutofocusMode("off");
      focusRingTimer.current = setTimeout(() => {
        setAutofocusMode("on");
      }, 120);
    }
  }, [cameraLive, scanned, focusRingAnim]);

  // Cleanup focus ring timer on unmount
  useEffect(() => {
    return () => {
      if (focusRingTimer.current) clearTimeout(focusRingTimer.current);
    };
  }, []);

  // ── Permission not yet resolved ────────────────────────────────────────────
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }

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

  const cameraLive = cameraActive && hardwareAvailable !== null && cameraAvailable && cameraPreviewReady;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" backgroundColor="transparent" translucent />

      {/* Black placeholder holds space during all non-camera states */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]} />

      {hardwareAvailable === null ? (
        null
      ) : !cameraAvailable && isFocused ? (
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
        <CameraErrorBoundary onError={() => markCameraUnavailable("unavailable")}>
          <>
            <CameraView
              key={focusKey}
              style={StyleSheet.absoluteFillObject}
              facing={facing}
              enableTorch={flashOn && facing === "back"}
              zoom={zoom}
              // iOS: explicitly request continuous autofocus
              // Android: omit — CameraX default is already continuous
              autofocus={autofocusMode}
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

            {/* Blue-frame shield — removed once onCameraReady fires */}
            {!cameraPreviewReady && (
              <View
                style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]}
                pointerEvents="none"
              />
            )}
          </>
        </CameraErrorBoundary>
      ) : null}

      {/* Tap-to-focus area — transparent, sits between camera and overlay */}
      {cameraLive && !scanned && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, styles.tapArea]}
          onPress={(e) => handleTapFocus(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        />
      )}

      {/* Tap-to-focus ring indicator */}
      {focusPoint && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.focusRing,
            {
              left:    focusPoint.x - 28,
              top:     focusPoint.y - 28,
              opacity: focusRingAnim,
              transform: [{
                scale: focusRingAnim.interpolate({
                  inputRange:  [0, 1],
                  outputRange: [1.4, 1],
                }),
              }],
            },
          ]}
        />
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

      {/* Processing overlay */}
      {processing && <ProcessingOverlay />}

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
    </View>
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

  // Transparent tap-to-focus area (below the scanner overlay so buttons still work)
  tapArea: {
    zIndex: 1,
  },

  // Small square focus ring that appears where the user taps
  focusRing: {
    position:     "absolute",
    width:        56,
    height:       56,
    borderRadius: 8,
    borderWidth:  1.5,
    borderColor:  "rgba(255,255,255,0.80)",
    zIndex:       5,
  },
});
