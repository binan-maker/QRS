import React, { useMemo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { shadow } from "@/shared/utils/platform";
import { FINDER_SIZE } from "@/features/scanner/hooks/useCameraControls";
import { SCANNER_GLOW } from "./constants";

const CORNER_LEN    = 36;
const CORNER_W      = 3.5;
const CORNER_RADIUS = 10;

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
      {/* Outer ambient glow ring */}
      <Animated.View
        style={[styles.pulseRing, { transform: [{ scale: pulse1Scale }], opacity: pulse1Opacity }]}
      />
      <Animated.View
        style={[styles.pulseRing, styles.pulseRing2, { transform: [{ scale: pulse2Scale }], opacity: pulse2Opacity }]}
      />

      {/* Inner frosted border */}
      <View style={styles.innerBorder} />

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

      {/* Scan beam with gradient fade */}
      {!scanned && (
        <Animated.View style={[styles.scanBeam, { transform: [{ translateY: scanLineY }] }]}>
          <View style={styles.beamLine} />
          <View style={styles.beamGlow} />
        </Animated.View>
      )}

      {/* Success overlay */}
      {scanSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successOuterRing}>
            <View style={styles.successRing}>
              <Ionicons name="checkmark" size={46} color="#000" />
            </View>
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

  innerBorder: {
    position:     "absolute",
    top:          0,
    left:         0,
    right:        0,
    bottom:       0,
    borderRadius: 18,
    borderWidth:  1,
    borderColor:  "rgba(255,255,255,0.06)",
  },

  pulseRing: {
    position:     "absolute",
    width:        FINDER_SIZE,
    height:       FINDER_SIZE,
    borderRadius: 20,
    borderWidth:  1.5,
    borderColor:  SCANNER_GLOW,
    top:          0,
    left:         0,
  },
  pulseRing2: { borderColor: `${SCANNER_GLOW}88` },

  corner: {
    position:        "absolute",
    backgroundColor: SCANNER_GLOW,
    ...shadow(8, SCANNER_GLOW, 0.7, 0, 0, 4),
  },

  // ── Top-left ──
  ctlH: {
    top:                     0,
    left:                    0,
    width:                   CORNER_LEN,
    height:                  CORNER_W,
    borderTopLeftRadius:     CORNER_RADIUS,
    borderBottomRightRadius: CORNER_RADIUS,
  },
  ctlV: {
    top:                     0,
    left:                    0,
    width:                   CORNER_W,
    height:                  CORNER_LEN,
    borderTopLeftRadius:     CORNER_RADIUS,
    borderBottomRightRadius: CORNER_RADIUS,
  },

  // ── Top-right ──
  ctrH: {
    top:                    0,
    right:                  0,
    width:                  CORNER_LEN,
    height:                 CORNER_W,
    borderTopRightRadius:   CORNER_RADIUS,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  ctrV: {
    top:                    0,
    right:                  0,
    width:                  CORNER_W,
    height:                 CORNER_LEN,
    borderTopRightRadius:   CORNER_RADIUS,
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
    position: "absolute",
    left:     0,
    right:    0,
    height:   3,
  },
  beamLine: {
    position:        "absolute",
    left:            0,
    right:           0,
    height:          2,
    borderRadius:    1,
    backgroundColor: SCANNER_GLOW,
    ...shadow(16, SCANNER_GLOW, 1, 0, 0, 8),
  },
  beamGlow: {
    position:        "absolute",
    left:            "10%",
    right:           "10%",
    height:          12,
    top:             -5,
    borderRadius:    6,
    backgroundColor: `${SCANNER_GLOW}22`,
  },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,212,255,0.06)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  successOuterRing: {
    width:           104,
    height:          104,
    borderRadius:    52,
    backgroundColor: "rgba(0,212,255,0.1)",
    borderWidth:     1,
    borderColor:     `${SCANNER_GLOW}44`,
    alignItems:      "center",
    justifyContent:  "center",
  },
  successRing: {
    width:           82,
    height:          82,
    borderRadius:    41,
    backgroundColor: SCANNER_GLOW,
    alignItems:      "center",
    justifyContent:  "center",
    ...shadow(24, SCANNER_GLOW, 0.7, 0, 0, 12),
  },
});
