import React, { useMemo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { shadow } from "@/shared/utils/platform";
import { FINDER_SIZE } from "@/features/scanner/hooks/useCameraControls";
import { SCANNER_GLOW } from "./constants";

const CORNER_LEN    = 28;
const CORNER_W      = 3;
const CORNER_RADIUS = 8; // rounded tips on each corner arm

interface Props {
  scanned:       boolean;
  scanSuccess:   boolean;
  scanLineAnim:  Animated.Value;
  cornerGlow:    Animated.Value;
  pulse1Scale:   Animated.AnimatedInterpolation<number>;
  pulse1Opacity: Animated.AnimatedInterpolation<number>;
  pulse2Scale:   Animated.AnimatedInterpolation<number>;
  pulse2Opacity: Animated.AnimatedInterpolation<number>;
}

export default function FinderFrame({
  scanned,
  scanSuccess,
  scanLineAnim,
  cornerGlow,
  pulse1Scale,
  pulse1Opacity,
  pulse2Scale,
  pulse2Opacity,
}: Props) {
  const scanLineY = useMemo(
    () => scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, FINDER_SIZE - 2] }),
    [scanLineAnim]
  );

  return (
    <View style={styles.frame}>
      {/* Pulse rings */}
      <Animated.View
        style={[styles.pulseRing, { transform: [{ scale: pulse1Scale }], opacity: pulse1Opacity }]}
      />
      <Animated.View
        style={[styles.pulseRing, styles.pulseRing2, { transform: [{ scale: pulse2Scale }], opacity: pulse2Opacity }]}
      />

      {/* ── Top-left corner ── */}
      <Animated.View style={[styles.corner, styles.ctlH, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.ctlV, { opacity: cornerGlow }]} />

      {/* ── Top-right corner ── */}
      <Animated.View style={[styles.corner, styles.ctrH, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.ctrV, { opacity: cornerGlow }]} />

      {/* ── Bottom-left corner ── */}
      <Animated.View style={[styles.corner, styles.cblH, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.cblV, { opacity: cornerGlow }]} />

      {/* ── Bottom-right corner ── */}
      <Animated.View style={[styles.corner, styles.cbrH, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.cbrV, { opacity: cornerGlow }]} />

      {/* Scan beam */}
      {!scanned && (
        <Animated.View style={[styles.scanBeam, { transform: [{ translateY: scanLineY }] }]} />
      )}

      {/* Success overlay */}
      {scanSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successRing}>
            <Ionicons name="checkmark" size={44} color="#000" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width:    FINDER_SIZE,
    height:   FINDER_SIZE,
    overflow: "hidden",
  },

  // Pulse rings — generously rounded to match the rounded-corner theme
  pulseRing: {
    position:     "absolute",
    width:        FINDER_SIZE,
    height:       FINDER_SIZE,
    borderRadius: 22,
    borderWidth:  1.5,
    borderColor:  SCANNER_GLOW,
    top:          0,
    left:         0,
  },
  pulseRing2: { borderColor: SCANNER_GLOW },

  // Shared corner style
  corner: {
    position:        "absolute",
    backgroundColor: SCANNER_GLOW,
  },

  // ── Top-left ──
  // horizontal arm: outer tip rounded top-left, inner tip rounded bottom-right
  ctlH: {
    top:                  0,
    left:                 0,
    width:                CORNER_LEN,
    height:               CORNER_W,
    borderTopLeftRadius:  CORNER_RADIUS,
    borderBottomRightRadius: CORNER_RADIUS,
  },
  // vertical arm: outer tip rounded top-left, inner tip rounded bottom-right
  ctlV: {
    top:                  0,
    left:                 0,
    width:                CORNER_W,
    height:               CORNER_LEN,
    borderTopLeftRadius:  CORNER_RADIUS,
    borderBottomRightRadius: CORNER_RADIUS,
  },

  // ── Top-right ──
  ctrH: {
    top:                   0,
    right:                 0,
    width:                 CORNER_LEN,
    height:                CORNER_W,
    borderTopRightRadius:  CORNER_RADIUS,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  ctrV: {
    top:                   0,
    right:                 0,
    width:                 CORNER_W,
    height:                CORNER_LEN,
    borderTopRightRadius:  CORNER_RADIUS,
    borderBottomLeftRadius: CORNER_RADIUS,
  },

  // ── Bottom-left ──
  cblH: {
    bottom:                 0,
    left:                   0,
    width:                  CORNER_LEN,
    height:                 CORNER_W,
    borderBottomLeftRadius: CORNER_RADIUS,
    borderTopRightRadius:   CORNER_RADIUS,
  },
  cblV: {
    bottom:                 0,
    left:                   0,
    width:                  CORNER_W,
    height:                 CORNER_LEN,
    borderBottomLeftRadius: CORNER_RADIUS,
    borderTopRightRadius:   CORNER_RADIUS,
  },

  // ── Bottom-right ──
  cbrH: {
    bottom:                  0,
    right:                   0,
    width:                   CORNER_LEN,
    height:                  CORNER_W,
    borderBottomRightRadius: CORNER_RADIUS,
    borderTopLeftRadius:     CORNER_RADIUS,
  },
  cbrV: {
    bottom:                  0,
    right:                   0,
    width:                   CORNER_W,
    height:                  CORNER_LEN,
    borderBottomRightRadius: CORNER_RADIUS,
    borderTopLeftRadius:     CORNER_RADIUS,
  },

  scanBeam: {
    position:        "absolute",
    left:            0,
    right:           0,
    height:          2,
    borderRadius:    1,
    backgroundColor: SCANNER_GLOW,
    ...shadow(14, SCANNER_GLOW, 0.9, 0, 0, 6),
  },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,212,255,0.1)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  successRing: {
    width:           86,
    height:          86,
    borderRadius:    43,
    backgroundColor: SCANNER_GLOW,
    alignItems:      "center",
    justifyContent:  "center",
    ...shadow(20, SCANNER_GLOW, 0.6, 0, 0, 10),
  },
});
