import { useRef, useEffect, useState, Component } from "react";
import { Platform, View, Text, StyleSheet, ActivityIndicator, Animated, Dimensions, Pressable } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

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
import LivingShieldModal from "@/features/scanner/components/LivingShieldModal";
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

function CameraUnavailableBanner({ onPickImage }: { onPickImage: () => void }) {
  return (
    <View style={bannerStyles.container}>
      <View style={bannerStyles.iconWrap}>
        <Ionicons name="camera-off-outline" size={40} color="#f59e0b" />
      </View>
      <Text style={bannerStyles.title}>Camera Unavailable</Text>
      <Text style={bannerStyles.subtitle}>
        The camera hardware could not be accessed. You can still scan QR codes by uploading an image from your gallery.
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
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Math.max(insets.bottom, 24);

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

      {/* Camera wrapped in error boundary — shows fallback if hardware fails */}
      {cameraAvailable ? (
        <CameraErrorBoundary onError={() => setCameraAvailable(false)}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            enableTorch={flashOn && facing === "back"}
            zoom={zoom}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
        </CameraErrorBoundary>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#080c14", justifyContent: "center", alignItems: "center", paddingTop: topInset }]}>
          <CameraUnavailableBanner onPickImage={handlePickImage} />
        </View>
      )}

      {/* Overlay is always visible so gallery button is always accessible */}
      {cameraAvailable && (
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
          <Reanimated.View entering={FadeIn.duration(200)} style={[styles.processingBox, { backgroundColor: colors.surface, borderColor: colors.primary + "25" }]}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.processingTitle, { color: colors.text }]}>Analyzing QR Code</Text>
            <Text style={[styles.processingSubtitle, { color: colors.textSecondary }]}>Checking trust score & community reports...</Text>
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

      <LivingShieldModal
        visible={livingShieldModal}
        loading={livingShieldLoading}
        data={livingShieldData}
        onProceed={handleLivingShieldProceed}
        onCancel={handleLivingShieldCancel}
      />

      {unverifiedModal && (
        <View style={styles.overlay}>
          <Reanimated.View entering={FadeInDown.duration(350)} style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={[styles.badge, { backgroundColor: "rgba(255,165,0,0.12)" }]}>
              <Text style={styles.helpIcon}>?</Text>
            </View>
            <Text style={[styles.sheetTitle, { color: "#FFA500" }]}>Unverified Source</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
              This QR code has no registered owner or cryptographic signature. It may be legitimate but cannot be verified by QR Guard.
            </Text>
            <View style={styles.countdownRing}>
              <Text style={styles.countdownNum}>{unverifiedCountdown}</Text>
            </View>
            <Text style={[styles.countdownHint, { color: colors.textMuted }]}>
              Proceeding automatically in {unverifiedCountdown} second{unverifiedCountdown !== 1 ? "s" : ""}…
            </Text>
            <View onTouchEnd={handleUnverifiedProceed} style={[styles.proceedBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.proceedBtnText, { color: colors.textSecondary }]}>View Now</Text>
            </View>
            <View onTouchEnd={handleUnverifiedBack} style={[styles.backBtn, { backgroundColor: colors.warning }]}>
              <Text style={styles.backBtnText}>Cancel</Text>
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
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingBox: {
    padding: 36,
    borderRadius: 24,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    maxWidth: 280,
  },
  processingTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  processingSubtitle: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 48,
    alignItems: "center", gap: 12,
    borderWidth: 1,
  },
  badge: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  helpIcon: { fontSize: 32, color: "#FFA500", fontFamily: "Inter_700Bold" },
  sheetTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  sheetSubtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 21,
  },
  countdownRing: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 3, borderColor: "#FFA500",
    alignItems: "center", justifyContent: "center", marginVertical: 4,
  },
  countdownNum: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFA500" },
  countdownHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8 },
  proceedBtn: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  proceedBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  backBtn: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 14,
  },
  backBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
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
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#f59e0b",
    textAlign: "center",
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
