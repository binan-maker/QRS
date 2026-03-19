import { useRef, useEffect } from "react";
import { Platform, View, Text, StyleSheet, ActivityIndicator, Animated, Dimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useScanner } from "@/hooks/useScanner";
import ScannerOverlay from "@/features/scanner/components/ScannerOverlay";
import SafetyModal from "@/features/scanner/components/SafetyModal";
import VerifiedModal from "@/features/scanner/components/VerifiedModal";
import LivingShieldModal from "@/features/scanner/components/LivingShieldModal";
import PermissionScreen from "@/features/scanner/components/PermissionScreen";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TOAST_DURATION = 3200;

function GalleryScanErrorToast({ message, onDone }: { message: string; onDone: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: TOAST_DURATION - 400, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      onDone();
    });
  }, []);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_WIDTH - 32] });

  return (
    <Animated.View style={[toastStyles.wrapper, { opacity }]}>
      <View style={toastStyles.toast}>
        <Text style={toastStyles.icon}>⚠</Text>
        <Text style={toastStyles.msg} numberOfLines={2}>{message}</Text>
      </View>
      <View style={toastStyles.trackBg}>
        <Animated.View style={[toastStyles.trackFill, { width: barWidth }]} />
      </View>
    </Animated.View>
  );
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
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

      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flashOn}
        zoom={zoom}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

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
      />

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

      {galleryErrorMsg && (
        <View style={[toastStyles.container, { bottom: bottomInset + 16 }]}>
          <GalleryScanErrorToast
            message={galleryErrorMsg}
            onDone={dismissGalleryError}
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
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#1a0a0a",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  icon: { fontSize: 18, color: "#ef4444" },
  msg: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#fca5a5", lineHeight: 18 },
  trackBg: { height: 3, backgroundColor: "rgba(239,68,68,0.2)" },
  trackFill: { height: 3, backgroundColor: "#ef4444", borderRadius: 2 },
});
