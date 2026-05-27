import React from "react";
import { View, Text, StyleSheet, Animated, useWindowDimensions } from "react-native";
import { FINDER_SIZE } from "@/features/scanner/hooks/useCameraControls";
import { useOverlayAnimations } from "@/features/scanner/hooks/useOverlayAnimations";
import FinderFrame from "@/features/scanner/components/FinderFrame";
import OverlayTopBar from "@/features/scanner/components/OverlayTopBar";
import OverlayBottomBar from "@/features/scanner/components/OverlayBottomBar";

const VIGNETTE = "rgba(4, 8, 20, 0.82)";
const DOT_SIZE = 5;
const GLOW     = "#00D4FF";

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

  const TOP_BAR_H    = topInset + 8 + 56;
  const BOTTOM_BAR_H = Math.max(bottomInset, 8) + 16 + 140;
  const availH       = screenHeight - TOP_BAR_H - BOTTOM_BAR_H;
  const finderTop    = TOP_BAR_H + Math.max(0, (availH - FINDER_SIZE) / 2);
  const finderLeft   = (screenWidth - FINDER_SIZE) / 2;

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.outerContainer]}>

      {/* ── Vignette masks + finder frame + hint (non-interactive) ── */}
      <View style={[StyleSheet.absoluteFillObject, styles.nonInteractive]}>
        <View style={[styles.mask, { top: 0, left: 0, right: 0, height: finderTop }]} />
        <View style={[styles.mask, { top: finderTop, left: 0, width: finderLeft, height: FINDER_SIZE }]} />
        <View style={[styles.mask, { top: finderTop, left: finderLeft + FINDER_SIZE, right: 0, height: FINDER_SIZE }]} />
        <View style={[styles.mask, { top: finderTop + FINDER_SIZE, left: 0, right: 0, bottom: 0 }]} />

        <View style={{ position: "absolute", top: finderTop, left: finderLeft }}>
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
        </View>

        {/* Hint below finder */}
        <View style={[styles.hintArea, { top: finderTop + FINDER_SIZE + 18 }]}>
          <Text style={styles.hintMain}>
            {scanSuccess
              ? "Code captured"
              : scanned
              ? "Processing…"
              : "Position QR code inside the frame"}
          </Text>
          {!scanned && (
            <View style={styles.liveRow}>
              <Animated.View style={[styles.liveDot, { opacity: anims.dotBlink }]} />
              <Text style={styles.liveText}>Shield Active</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Top bar ── */}
      <OverlayTopBar
        topInset={topInset}
        flashOn={flashOn}
        onToggleFlash={onToggleFlash}
        facing={facing}
        onFlipCamera={onFlipCamera}
        anonymousMode={anonymousMode}
        onToggleAnonymous={onToggleAnonymous}
        user={user}
      />

      {/* ── Bottom controls ── */}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer:  { pointerEvents: "box-none" },
  nonInteractive:  { pointerEvents: "none" },
  mask:            { position: "absolute", backgroundColor: VIGNETTE },

  hintArea: {
    position:  "absolute",
    left:      0,
    right:     0,
    alignItems: "center",
    gap:       8,
  },
  hintMain: {
    fontSize:     14,
    fontFamily:   "Inter_500Medium",
    color:        "rgba(255,255,255,0.7)",
    textAlign:    "center",
    letterSpacing: 0.1,
  },
  liveRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  liveDot: {
    width:           DOT_SIZE,
    height:          DOT_SIZE,
    borderRadius:    DOT_SIZE / 2,
    backgroundColor: GLOW,
  },
  liveText: {
    fontSize:     11,
    fontFamily:   "Inter_600SemiBold",
    color:        GLOW,
    letterSpacing: 0.5,
  },
});
