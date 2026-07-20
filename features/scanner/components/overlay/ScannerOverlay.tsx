import React from "react";
import { View, Text, StyleSheet, Animated, useWindowDimensions } from "react-native";
import ReAnimated, { FadeIn } from "react-native-reanimated";
import { FINDER_SIZE } from "@/features/scanner/hooks/useCameraControls";
import { useOverlayAnimations } from "@/features/scanner/hooks/useOverlayAnimations";
import FinderFrame from "./FinderFrame";
import OverlayTopBar from "./OverlayTopBar";
import OverlayBottomBar from "./OverlayBottomBar";

interface Props {
  topInset:           number;
  bottomInset:        number;
  flashOn:            boolean;
  onToggleFlash:      () => void;
  zoom:               number;
  zoomLabel:          string;
  onCycleZoom:        () => void;
  scanned:            boolean;
  scanSuccess:        boolean;
  scanLineAnim:       Animated.Value;
  anonymousMode:      boolean;
  onToggleAnonymous:  () => void;
  onPickImage:        () => void;
  onReset:            () => void;
  user:               any;
  facing:             "back" | "front";
  onFlipCamera:       () => void;
  lowLightSuggested?: boolean;
}

export default function ScannerOverlay({
  topInset,
  bottomInset,
  flashOn,
  onToggleFlash,
  zoom,
  zoomLabel,
  onCycleZoom,
  scanned,
  scanSuccess,
  anonymousMode,
  onToggleAnonymous,
  onPickImage,
  onReset,
  user,
  facing,
  onFlipCamera,
  lowLightSuggested = false,
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const anims = useOverlayAnimations();

  const TOP_BAR_H    = topInset + 12 + 60;
  const BOTTOM_BAR_H = Math.max(bottomInset, 12) + 20 + 110;
  const availH       = screenHeight - TOP_BAR_H - BOTTOM_BAR_H;
  const finderTop    = TOP_BAR_H + Math.max(0, (availH - FINDER_SIZE) / 2);
  const finderLeft   = (screenWidth - FINDER_SIZE) / 2;

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.outerContainer]}>

      {/* Non-interactive layer: title + finder + status */}
      <View style={[StyleSheet.absoluteFillObject, styles.nonInteractive]}>

        {/* Primary title — above the finder, large and immediately readable */}
        <ReAnimated.View
          entering={FadeIn.delay(80).duration(220)}
          style={[styles.titleArea, { top: finderTop - 62 }]}
        >
          <Text style={styles.titleText}>Scan a QR code</Text>
        </ReAnimated.View>

        {/* Finder frame */}
        <View style={{ position: "absolute", top: finderTop, left: finderLeft }}>
          <ReAnimated.View entering={FadeIn.delay(60).duration(220)}>
            <FinderFrame
              scanned={scanned}
              scanSuccess={scanSuccess}
              cornerBreath={anims.cornerBreath}
            />
          </ReAnimated.View>
        </View>

        {/* Secondary status text — below finder, only during/after a scan */}
        {scanned && (
          <ReAnimated.View
            entering={FadeIn.duration(180)}
            style={[styles.hintArea, { top: finderTop + FINDER_SIZE + 20 }]}
          >
            <Text style={styles.hintText}>
              {scanSuccess ? "Code captured" : "Analyzing…"}
            </Text>
          </ReAnimated.View>
        )}
      </View>

      {/* Top bar — back btn | BinRo | eye icon */}
      <OverlayTopBar
        topInset={topInset}
        anonymousMode={anonymousMode}
        onToggleAnonymous={onToggleAnonymous}
        user={user}
      />

      {/* Bottom controls — Gallery + Torch centered */}
      <OverlayBottomBar
        bottomInset={bottomInset}
        zoom={zoom}
        zoomLabel={zoomLabel}
        onCycleZoom={onCycleZoom}
        anonymousMode={anonymousMode}
        scanned={scanned}
        onPickImage={onPickImage}
        onReset={onReset}
        user={user}
        scanReady={anims.scanReady}
        flashOn={flashOn}
        onToggleFlash={onToggleFlash}
        facing={facing}
        onFlipCamera={onFlipCamera}
        onToggleAnonymous={onToggleAnonymous}
        lowLightSuggested={lowLightSuggested}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { pointerEvents: "box-none" },
  nonInteractive: { pointerEvents: "none" },

  // Primary title — sits above the finder frame
  titleArea: {
    position:   "absolute",
    left:       0,
    right:      0,
    alignItems: "center",
  },
  titleText: {
    fontSize:      22,
    fontFamily:    "Inter_600SemiBold",
    color:         "rgba(255,255,255,0.92)",
    textAlign:     "center",
    letterSpacing: -0.2,
  },

  // Secondary status — below the finder during/after a scan
  hintArea: {
    position:   "absolute",
    left:       0,
    right:      0,
    alignItems: "center",
  },
  hintText: {
    fontSize:      13,
    fontFamily:    "Inter_400Regular",
    color:         "rgba(255,255,255,0.60)",
    textAlign:     "center",
    letterSpacing: 0.1,
  },
});
