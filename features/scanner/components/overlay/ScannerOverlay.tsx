import React from "react";
import { View, Text, StyleSheet, Animated, useWindowDimensions } from "react-native";
import ReAnimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { FINDER_SIZE } from "@/features/scanner/hooks/useCameraControls";
import { useOverlayAnimations } from "@/features/scanner/hooks/useOverlayAnimations";
import FinderFrame from "./FinderFrame";
import OverlayTopBar from "./OverlayTopBar";
import OverlayBottomBar from "./OverlayBottomBar";
import { SCANNER_GLOW } from "./constants";

const DOT_SIZE   = 6;
const VIGNETTE   = "rgba(0, 0, 0, 0.55)";

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
  scanLineAnim,
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

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.outerContainer]}>

      {/* Dark vignette masks around the finder */}
      <View style={[StyleSheet.absoluteFillObject, styles.nonInteractive]}>
        <ReAnimated.View
          entering={FadeIn.delay(30).duration(280)}
          style={StyleSheet.absoluteFillObject}
        >
          {/* Top mask */}
          <View style={[styles.mask, { top: 0, left: 0, right: 0, height: finderTop }]} />
          {/* Left mask */}
          <View style={[styles.mask, { top: finderTop, left: 0, width: finderLeft, height: FINDER_SIZE }]} />
          {/* Right mask */}
          <View style={[styles.mask, { top: finderTop, left: finderLeft + FINDER_SIZE, right: 0, height: FINDER_SIZE }]} />
          {/* Bottom mask */}
          <View style={[styles.mask, { top: finderTop + FINDER_SIZE, left: 0, right: 0, bottom: 0 }]} />
        </ReAnimated.View>

        {/* Finder frame */}
        <View style={{ position: "absolute", top: finderTop, left: finderLeft }}>
          <ReAnimated.View entering={FadeIn.delay(60).duration(260)}>
            <FinderFrame
              scanned={scanned}
              scanSuccess={scanSuccess}
              scanLineAnim={scanLineAnim}
              cornerGlow={anims.cornerGlow}
              pulse1Scale={anims.pulse1Scale}
              pulse1Opacity={anims.pulse1Opacity}
              pulse2Scale={anims.pulse2Scale}
              pulse2Opacity={anims.pulse2Opacity}
            />
          </ReAnimated.View>
        </View>

        {/* Status text below finder */}
        <ReAnimated.View
          entering={FadeInDown.delay(100).duration(280)}
          style={[styles.hintArea, { top: finderTop + FINDER_SIZE + 22 }]}
        >
          <Text style={styles.hintMain}>
            {scanSuccess
              ? "Code captured"
              : scanned
              ? "Analyzing…"
              : "Align QR code within the frame"}
          </Text>

          {!scanned && (
            <ReAnimated.View
              entering={FadeIn.delay(100).duration(260)}
              style={styles.liveRow}
            >
              <Animated.View style={[styles.liveDot, { opacity: anims.dotBlink }]} />
              <Text style={styles.liveText}>Shield Active</Text>
            </ReAnimated.View>
          )}
        </ReAnimated.View>
      </View>

      {/* Top bar */}
      <OverlayTopBar topInset={topInset} />

      {/* Bottom controls */}
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
  outerContainer: { pointerEvents: "box-none" },
  nonInteractive: { pointerEvents: "none" },
  mask: {
    position:        "absolute",
    backgroundColor: VIGNETTE,
  },

  hintArea: {
    position:   "absolute",
    left:       0,
    right:      0,
    alignItems: "center",
    gap:        10,
  },
  hintMain: {
    fontSize:      15,
    fontFamily:    "Inter_500Medium",
    color:         "rgba(255,255,255,0.75)",
    textAlign:     "center",
    letterSpacing: 0.1,
  },
  liveRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           7,
    paddingHorizontal: 14,
    paddingVertical:   5,
    borderRadius:  20,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth:   1,
    borderColor:   "rgba(0,212,255,0.18)",
  },
  liveDot: {
    width:           DOT_SIZE,
    height:          DOT_SIZE,
    borderRadius:    DOT_SIZE / 2,
    backgroundColor: SCANNER_GLOW,
  },
  liveText: {
    fontSize:      11,
    fontFamily:    "Inter_600SemiBold",
    color:         SCANNER_GLOW,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
