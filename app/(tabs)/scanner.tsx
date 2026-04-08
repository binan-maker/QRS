import { useRef, useEffect, useState, Component } from "react";
import { Platform, View, Text, StyleSheet, ActivityIndicator, Animated, Dimensions, Pressable } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

class CameraErrorBoundary extends Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
import { useTheme } from "@/contexts/ThemeContext";
import { useScanner } from "@/hooks/useScanner";
import ScannerOverlay from "@/features/scanner/components/ScannerOverlay";
import SafetyModal from "@/features/scanner/components/SafetyModal";
import VerifiedModal from "@/features/scanner/components/VerifiedModal";
import PermissionScreen from "@/features/scanner/components/PermissionScreen";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TOAST_DURATION = 3200;

const TOAST_COLORS = {
  error: {
    bg: "#1a0a0a",
    border: "rgba(239,68,68,0.4)",
    icon: "#ef4444",
    text: "#fca5a5",
    track: "rgba(239,68,68,0.2)",
    fill: "#ef4444",
    iconChar: "✕",
  },
  warning: {
    bg: "#1a1200",
    border: "rgba(245,158,11,0.4)",
    icon: "#f59e0b",
    text: "#fde68a",
    track: "rgba(245,158,11,0.2)",
    fill: "#f59e0b",
    iconChar: "⚠",
  },
  info: {
    bg: "#0a1020",
    border: "rgba(0,212,255,0.35)",
    icon: "#00d4ff",
    text: "#a5f3ff",
    track: "rgba(0,212,255,0.2)",
    fill: "#00d4ff",
    iconChar: "ℹ",
  },
};

function ScannerToast({
  message,
  type = "error",
  onDone,
}: {
  message: string;
  type?: "error" | "warning" | "info";
  onDone: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const c = TOAST_COLORS[type];

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: TOAST_DURATION - 400, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_WIDTH - 32] });

  return (
    <Animated.View
      style={[
        toastStyles.wrapper,
        { opacity, backgroundColor: c.bg, borderColor: c.border },
      ]}
    >
      <View style={toastStyles.toast}>
        <View style={[toastStyles.iconWrap, { backgroundColor: c.icon + "22" }]}>
          <Text style={[toastStyles.icon, { color: c.icon }]}>{c.iconChar}</Text>
        </View>
        <Text style={[toastStyles.msg, { color: c.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
      <View style={[toastStyles.trackBg, { backgroundColor: c.track }]}>
        <Animated.View style={[toastStyles.trackFill, { width: barWidth, backgroundColor: c.fill }]} />
      </View>
    </Animated.View>
  );
}

type CameraErrorType = "unavailable" | "inuse";

function CameraUnavailableBanner({
  onPickImage,
  errorType,
}: {
  onPickImage: () => void;
  errorType: CameraErrorType;
}) {
  const isInUse = errorType === "inuse";
  return (
    <View style={bannerStyles.container}>
      <View style={[bannerStyles.iconWrap, isInUse && bannerStyles.iconWrapBlue]}>
        <Ionicons
          name="camera-outline"
          size={40}
          color={isInUse ? "#00d4ff" : "#f59e0b"}
        />
      </View>
      <Text style={[bannerStyles.title, isInUse && bannerStyles.titleBlue]}>
        {isInUse ? "Camera In Use" : "Camera Unavailable"}
      </Text>
      <Text style={bannerStyles.subtitle}>
        {isInUse
          ? "Your camera is currently being used by another app. Please close that app and try again, or scan a QR code from your gallery."
          : "The camera hardware could not be accessed on this device. You can still scan QR codes by uploading an image from your gallery."}
      </Text>
      <Pressable
        onPress={onPickImage}
        style={({ pressed }) => [bannerStyles.btn, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name="images-outline" size={18} color="#000" />
        <Text style={bannerStyles.btnText}>Scan from Gallery</Text>
      </Pressable>
    </View>
  );
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  // null = still checking hardware, true = hardware ok, false = hardware unavailable
  const [hardwareAvailable, setHardwareAvailable] = useState<boolean | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [cameraErrorType, setCameraErrorType] = useState<CameraErrorType>("unavailable");
  const cameraReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Math.max(insets.bottom, 24);

  // Step 1: Check hardware availability BEFORE rendering CameraView.
  // On Android, isAvailableAsync() can return false incorrectly on many real
  // devices in production (driver timing, permission state, OEM restrictions).
  // Instead, default to available on Android and rely on onMountError + the
  // ready-timer as the real safety net. Only use isAvailableAsync() on iOS/web
  // where the result is reliable.
  useEffect(() => {
    let cancelled = false;
    if (Platform.OS === "android") {
      // Always assume available on Android; onMountError handles real failures.
      setHardwareAvailable(true);
      return () => { cancelled = true; };
    }
    CameraView.isAvailableAsync()
      .then((available) => {
        if (!cancelled) setHardwareAvailable(available);
      })
      .catch(() => {
        if (!cancelled) setHardwareAvailable(false);
      });
    return () => { cancelled = true; };
  }, []);

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

  // Step 2: If hardware is confirmed available, start a fallback timer.
  // If onCameraReady never fires (silent failure), show the unavailable screen.
  // Android camera init can be slow on low-end devices, so use 15s there.
  useEffect(() => {
    if (!permission?.granted || hardwareAvailable !== true) return;
    const timeoutMs = Platform.OS === "android" ? 15000 : 7000;
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
  }, [permission?.granted, hardwareAvailable]);

  const {
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
  } = useScanner();

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }

  if (!permission.granted) {
    return (
      <View style={[{ flex: 1, backgroundColor: "#000" }, { paddingTop: topInset }]}>
        <PermissionScreen
          canAskAgain={permission.canAskAgain}
          onRequestPermission={requestPermission}
          onPickImage={handlePickImage}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {Platform.OS !== "web" && <StatusBar hidden />}

      {/* Camera section — CameraView is NEVER rendered if hardware is absent */}
      {hardwareAvailable === null ? (
        /* Still running isAvailableAsync — show a plain black screen briefly */
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]} />
      ) : hardwareAvailable === false || !cameraAvailable ? (
        /* Hardware absent OR silent runtime failure — show banner, never touch CameraView */
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#080c14" }]}>
          <View style={{ paddingTop: topInset + 8, paddingHorizontal: 16, paddingBottom: 10 }}>
            <Pressable onPress={() => router.back()} style={styles.backIconBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <CameraUnavailableBanner onPickImage={handlePickImage} errorType={cameraErrorType} />
          </View>
        </View>
      ) : (
        /* Hardware confirmed — safe to render CameraView */
        <CameraErrorBoundary onError={() => markCameraUnavailable("unavailable")}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            enableTorch={flashOn && facing === "back"}
            zoom={zoom}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            onCameraReady={markCameraReady}
            onMountError={(error) => {
              const msg = (error?.message ?? "").toLowerCase();
              const isInUse =
                msg.includes("in use") ||
                msg.includes("busy") ||
                msg.includes("already") ||
                msg.includes("another app") ||
                msg.includes("restricted");
              markCameraUnavailable(isInUse ? "inuse" : "unavailable");
            }}
          />
        </CameraErrorBoundary>
      )}

      {/* Overlay only shown when camera is actually running */}
      {hardwareAvailable === true && cameraAvailable && (
        <ScannerOverlay
          topInset={topInset}
          bottomInset={bottomInset}
          flashOn={flashOn}
          onToggleFlash={() => setFlashOn(!flashOn)}
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

      {processing && (
        <View style={styles.processingOverlay}>
          <Reanimated.View entering={FadeIn.duration(220)} style={styles.processingBox}>
            <View style={styles.processingIconRing}>
              <ActivityIndicator color="#00D4FF" size="large" />
            </View>
            <View style={styles.processingTextGroup}>
              <Text style={styles.processingTitle}>Analyzing…</Text>
            </View>
          </Reanimated.View>
        </View>
      )}

      <SafetyModal
        visible={safetyModal}
        warnings={safetyWarnings}
        riskLevel={safetyRiskLevel}
        onProceed={handleSafetyModalProceed}
        onBack={handleSafetyModalBack}
      />

      <VerifiedModal
        visible={verifiedModal}
        ownerName={verifiedOwnerName}
      />

      {unverifiedModal && (
        <View style={styles.overlay}>
          <Reanimated.View entering={FadeInDown.duration(380).springify()} style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetAccentStripe} />
            <View style={styles.unverifiedIconGroup}>
              <View style={styles.unverifiedOuterRing}>
                <View style={styles.unverifiedInnerRing}>
                  <Ionicons name="help" size={34} color="#F59E0B" />
                </View>
              </View>
            </View>
            <View style={styles.sheetTextGroup}>
              <Text style={[styles.sheetTitle, { color: "#fff" }]}>Unverified Source</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                This QR code has no registered owner or cryptographic signature. It may be legitimate but we cannot confirm its identity.
              </Text>
            </View>
            <View style={styles.countdownGroup}>
              <View style={styles.countdownRing}>
                <Text style={styles.countdownNum}>{unverifiedCountdown}</Text>
              </View>
              <Text style={[styles.countdownHint, { color: colors.textMuted }]}>
                Auto-proceeding in {unverifiedCountdown}s
              </Text>
            </View>
            <View style={styles.sheetActions}>
              <View onTouchEnd={handleUnverifiedProceed} style={[styles.proceedBtn, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }]}>
                <Text style={[styles.proceedBtnText, { color: "rgba(255,255,255,0.6)" }]}>View Details Now</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.4)" />
              </View>
              <View onTouchEnd={handleUnverifiedBack} style={styles.cancelBtn}>
                <Ionicons name="arrow-back" size={18} color="#000" />
                <Text style={styles.cancelBtnText}>Stay Safe</Text>
              </View>
            </View>
          </Reanimated.View>
        </View>
      )}

      {/* Gallery scan errors (no QR found, network issues) */}
      {galleryErrorMsg && (
        <View style={[toastStyles.container, { bottom: bottomInset + 16 }]}>
          <ScannerToast
            message={galleryErrorMsg}
            type="error"
            onDone={dismissGalleryError}
          />
        </View>
      )}

      {/* General scanner messages (scan failed, sign in required, etc.) */}
      {scannerMsg && !galleryErrorMsg && (
        <View style={[toastStyles.container, { bottom: bottomInset + 16 }]}>
          <ScannerToast
            message={scannerMsg}
            type={scannerMsgType}
            onDone={dismissScannerMsg}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingBox: {
    backgroundColor: "rgba(16,25,41,0.98)",
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
    maxWidth: 300,
    width: "80%",
  },
  processingIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,212,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  processingTextGroup: { alignItems: "center" },
  processingTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 4,
  },
  backIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    alignItems: "center",
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    overflow: "hidden",
    paddingBottom: 36,
  },
  sheetAccentStripe: {
    width: "100%",
    height: 3,
    backgroundColor: "#F59E0B",
  },
  unverifiedIconGroup: {
    alignItems: "center",
    marginTop: 8,
  },
  unverifiedOuterRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    backgroundColor: "rgba(245,158,11,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  unverifiedInnerRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.35)",
    backgroundColor: "rgba(245,158,11,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTextGroup: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
  },
  sheetEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#F59E0B",
    letterSpacing: 2.5,
  },
  sheetTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  sheetSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  countdownGroup: {
    alignItems: "center",
    gap: 8,
  },
  countdownRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245,158,11,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownNum: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#F59E0B" },
  countdownHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sheetActions: {
    width: "100%",
    paddingHorizontal: 20,
    gap: 10,
  },
  proceedBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  proceedBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cancelBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: "#F59E0B",
  },
  cancelBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },
  sheetBottomMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sheetBottomMarkText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,212,255,0.35)",
    letterSpacing: 0.3,
  },
});

const toastStyles = StyleSheet.create({
  container: { position: "absolute", left: 16, right: 16 },
  wrapper: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: { fontSize: 15, fontWeight: "700" },
  msg: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  trackBg: { height: 3 },
  trackFill: { height: 3, borderRadius: 2 },
});

const bannerStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconWrapBlue: {
    backgroundColor: "rgba(0,212,255,0.12)",
    borderColor: "rgba(0,212,255,0.3)",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#f59e0b",
    textAlign: "center",
  },
  titleBlue: {
    color: "#00d4ff",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 21,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00d4ff",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  btnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
});
