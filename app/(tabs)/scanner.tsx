import { Platform, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useScanner } from "@/hooks/useScanner";
import ScannerOverlay from "@/features/scanner/components/ScannerOverlay";
import SafetyModal from "@/features/scanner/components/SafetyModal";
import VerifiedModal from "@/features/scanner/components/VerifiedModal";
import LivingShieldModal from "@/features/scanner/components/LivingShieldModal";
import PermissionScreen from "@/features/scanner/components/PermissionScreen";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

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
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <PermissionScreen
          canAskAgain={permission.canAskAgain}
          onRequestPermission={requestPermission}
          onPickImage={handlePickImage}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        bottomInset={Math.max(insets.bottom, 24)}
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
          <Reanimated.View entering={FadeIn.duration(200)} style={styles.processingBox}>
            <ActivityIndicator color={Colors.dark.primary} size="large" />
            <Text style={styles.processingTitle}>Analyzing QR Code</Text>
            <Text style={styles.processingSubtitle}>Checking trust score & community reports...</Text>
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
          <Reanimated.View entering={FadeInDown.duration(350)} style={styles.sheet}>
            <View style={[styles.badge, { backgroundColor: "rgba(255,165,0,0.12)" }]}>
              <Text style={styles.helpIcon}>?</Text>
            </View>
            <Text style={[styles.sheetTitle, { color: "#FFA500" }]}>Unverified Source</Text>
            <Text style={styles.sheetSubtitle}>
              This QR code has no registered owner or cryptographic signature. It may be legitimate but cannot be verified by QR Guard.
            </Text>
            <View style={styles.countdownRing}>
              <Text style={styles.countdownNum}>{unverifiedCountdown}</Text>
            </View>
            <Text style={styles.countdownHint}>
              Proceeding automatically in {unverifiedCountdown} second{unverifiedCountdown !== 1 ? "s" : ""}…
            </Text>
            <View onTouchEnd={handleUnverifiedProceed} style={styles.proceedBtn}>
              <Text style={styles.proceedBtnText}>View Now</Text>
            </View>
            <View onTouchEnd={handleUnverifiedBack} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Cancel</Text>
            </View>
          </Reanimated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingBox: {
    backgroundColor: Colors.dark.surface,
    padding: 36,
    borderRadius: 24,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.15)",
    maxWidth: 280,
  },
  processingTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  processingSubtitle: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary, textAlign: "center", lineHeight: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 48,
    alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  badge: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  helpIcon: { fontSize: 32, color: "#FFA500", fontFamily: "Inter_700Bold" },
  sheetTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  sheetSubtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary, textAlign: "center", lineHeight: 21,
  },
  countdownRing: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 3, borderColor: "#FFA500",
    alignItems: "center", justifyContent: "center", marginVertical: 4,
  },
  countdownNum: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFA500" },
  countdownHint: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginBottom: 8 },
  proceedBtn: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.dark.surface,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  proceedBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  backBtn: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.dark.warning, paddingVertical: 14, borderRadius: 14,
  },
  backBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
});
