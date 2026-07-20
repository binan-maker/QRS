import React from "react";
import { View, Text, StyleSheet, Animated, useWindowDimensions } from "react-native";
import ReAnimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { FINDER_SIZE } from "@/features/scanner/hooks/useCameraControls";
import { useOverlayAnimations } from "@/features/scanner/hooks/useOverlayAnimations";
import FinderFrame from "./FinderFrame";
import OverlayTopBar from "./OverlayTopBar";
import OverlayBottomBar from "./OverlayBottomBar";

interface Props {
  topInset:          number;
  bottomInset:       number;
  flashOn:           boolean;
  onToggleFlash:     () => void;
  zoom:              number;
  zoomLabel:         string;
  onCycleZoom:       () => void;
  scanned:           boolean;
  scanSuccess:       boolean;
  scanLineAnim:      Animated.Value;
  anonymousMode:     boolean;
  onToggleAnonymous: () => void;
  onPickImage:       () => void;
  onReset:           () => void;
  user:              any;
  facing:            "back" | "front";
  onFlipCamera:      () => void;
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
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const anims = useOverlayAnimations();

  const TOP_BAR_H    = topInset + 12 + 60;
  const BOTTOM_BAR_H = Math.max(bottomInset, 12) + 20 + 110;
  const availH       = screenHeight - TOP_BAR_H - BOTTOM_BAR_H;
  const finderTop    = TOP_BAR_H + Math.max(0, (availH - FINDER_SIZE) / 2);
  const finderLeft   = (screenWidth - FINDER_SIZE) / 2;

  const hintText = scanSuccess
    ? "Code captured"
    : scanned
    ? "Analyzing…"
    : "Scan a QR code";

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.outerContainer]}>

      {/* Non-interactive layer: finder + hint */}
      <View style={[StyleSheet.absoluteFillObject, styles.nonInteractive]}>
        <View style={{ position: "absolute", top: finderTop, left: finderLeft }}>
          <ReAnimated.View entering={FadeIn.delay(60).duration(220)}>
            <FinderFrame
              scanned={scanned}
              scanSuccess={scanSuccess}
              cornerBreath={anims.cornerBreath}
            />
          </ReAnimated.View>
        </View>

        <ReAnimated.View
          entering={FadeInDown.delay(100).duration(220)}
          style={[styles.hintArea, { top: finderTop + FINDER_SIZE + 20 }]}
        >
          <Text style={styles.hintText}>{hintText}</Text>
        </ReAnimated.View>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer:  { pointerEvents: "box-none" },
  nonInteractive:  { pointerEvents: "none" },
  hintArea: {
    position:   "absolute",
    left:       0,
    right:      0,
    alignItems: "center",
  },
  hintText: {
    fontSize:      13,
    fontFamily:    "Inter_400Regular",
    color:         "rgba(255,255,255,0.65)",
    textAlign:     "center",
    letterSpacing: 0.1,
  },
});
