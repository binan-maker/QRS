import { View, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTopInset } from "@/shared/utils/platform";
import { useScanner } from "@/features/scanner/hooks/useScanner";
import { useLowLightDetection } from "@/features/scanner/hooks/useLowLightDetection";
import { useCameraLifecycle } from "@/features/scanner/hooks/useCameraLifecycle";
import { useTapToFocus } from "@/features/scanner/hooks/useTapToFocus";
import {
  ScannerOverlay,
  ProcessingOverlay,
  PermissionScreen,
  CameraErrorBoundary,
  ScannerToast,
  toastContainerStyle,
  CameraUnavailableBanner,
  ConversionBanner,
  TapFocusRing,
} from "@/features/scanner/components";

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const bottomInset = Math.max(insets.bottom, 24);

  const life = useCameraLifecycle();
  const sc = useScanner({ isCameraAvailable: life.cameraAvailable });
  const { suggested: lowLightSuggested } = useLowLightDetection({
    cameraLive: life.cameraLive,
    scanned: sc.scanned,
    flashOn: sc.flashOn,
    facing: sc.facing,
  });
  const tap = useTapToFocus(life.cameraLive, sc.scanned);

  if (!life.permission) return <View style={styles.blackBg} />;
  if (!life.permission.granted) {
    return (
      <PermissionScreen
        canAskAgain={life.permission.canAskAgain}
        onRequestPermission={life.requestPermission}
      />
    );
  }

  return (
    <View style={styles.blackBg}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      {life.hardwareAvailable !== null && !life.cameraAvailable && life.isFocused ? (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#080c14" }]}>
          <View style={{ paddingTop: topInset + 8, paddingHorizontal: 16 }}>
            <Pressable onPress={() => router.replace("/(tabs)")} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          </View>
          <CameraUnavailableBanner
            onPickImage={sc.handlePickImage}
            onRetry={life.handleRetry}
            errorType={life.cameraErrorType}
          />
        </View>
      ) : life.cameraActive ? (
        <CameraErrorBoundary onError={() => life.markUnavailable("unavailable")}>
          <CameraView
            key={life.focusKey}
            style={StyleSheet.absoluteFillObject}
            facing={sc.facing}
            enableTorch={sc.flashOn && sc.facing === "back"}
            zoom={sc.zoom}
            autofocus={tap.autofocusMode}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={(d) => {
              sc.onQRBoundsDetected(d?.bounds);
              sc.handleBarCodeScanned(d);
            }}
            onCameraReady={life.markReady}
            onMountError={(e) =>
              life.markUnavailable(
                e?.message?.toLowerCase().includes("busy") ? "inuse" : "unavailable"
              )
            }
          />
          {!life.cameraPreviewReady && (
            <View style={[StyleSheet.absoluteFillObject, styles.blackBg]} pointerEvents="none" />
          )}
        </CameraErrorBoundary>
      ) : null}

      {life.cameraLive && !sc.scanned && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={(e) => tap.handleTapFocus(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        />
      )}
      {tap.focusPoint && (
        <TapFocusRing x={tap.focusPoint.x} y={tap.focusPoint.y} anim={tap.focusRingAnim} />
      )}

      {life.cameraLive && (
        <ScannerOverlay
          topInset={topInset}
          bottomInset={bottomInset}
          flashOn={sc.flashOn}
          onToggleFlash={sc.toggleFlash}
          zoom={sc.zoom}
          zoomLabel={sc.zoomLabel}
          onCycleZoom={sc.cycleZoom}
          scanned={sc.scanned}
          scanSuccess={sc.scanSuccess}
          anonymousMode={sc.anonymousMode}
          onToggleAnonymous={() => sc.setAnonymousMode(!sc.anonymousMode)}
          onPickImage={sc.handlePickImage}
          user={sc.user}
          facing={sc.facing}
          lowLightSuggested={lowLightSuggested}
        />
      )}

      {sc.processing && <ProcessingOverlay />}
      <ConversionBanner
        message={sc.conversionBannerMsg}
        visible={!sc.user && !!sc.conversionBannerMsg}
        bottomOffset={bottomInset + 16}
        onSignIn={() => router.push("/(auth)/login")}
        onDismiss={sc.dismissConversionBanner}
      />
      {(sc.galleryErrorMsg || sc.scannerMsg) && (
        <View style={[toastContainerStyle, { bottom: bottomInset + 16 }]}>
          <ScannerToast
            message={sc.galleryErrorMsg || sc.scannerMsg || ""}
            type={sc.galleryErrorMsg ? "error" : sc.scannerMsgType}
            onDone={sc.galleryErrorMsg ? sc.dismissGalleryError : sc.dismissScannerMsg}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blackBg: {
    flex: 1,
    backgroundColor: "#000",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
});
