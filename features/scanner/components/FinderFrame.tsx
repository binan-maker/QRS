import React, { useMemo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { shadow } from "@/shared/utils/platform";
import { FINDER_SIZE } from "@/features/scanner/hooks/useCameraControls";

const CORNER_LEN = 28;
const CORNER_W   = 3;
const GLOW       = "#00D4FF";

interface Props {
  scanned:      boolean;
  scanSuccess:  boolean;
  scanLineAnim: Animated.Value;
  cornerGlow:   Animated.Value;
  pulse1Scale:  Animated.AnimatedInterpolation<number>;
  pulse1Opacity: Animated.AnimatedInterpolation<number>;
  pulse2Scale:  Animated.AnimatedInterpolation<number>;
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

      {/* Corner brackets */}
      <Animated.View style={[styles.corner, styles.ctlH, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.ctlV, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.ctrH, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.ctrV, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.cblH, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.cblV, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.cbrH, { opacity: cornerGlow }]} />
      <Animated.View style={[styles.corner, styles.cbrV, { opacity: cornerGlow }]} />

      {/* Animated scan beam */}
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

  pulseRing: {
    position:    "absolute",
    width:       FINDER_SIZE,
    height:      FINDER_SIZE,
    borderRadius: 12,
    borderWidth:  1.5,
    borderColor:  GLOW,
    top:  0,
    left: 0,
  },
  pulseRing2: { borderColor: GLOW },

  corner: { position: "absolute", backgroundColor: GLOW },
  ctlH: { top: 0, left: 0, width: CORNER_LEN, height: CORNER_W, borderTopLeftRadius: 3 },
  ctlV: { top: 0, left: 0, width: CORNER_W, height: CORNER_LEN, borderTopLeftRadius: 3 },
  ctrH: { top: 0, right: 0, width: CORNER_LEN, height: CORNER_W, borderTopRightRadius: 3 },
  ctrV: { top: 0, right: 0, width: CORNER_W, height: CORNER_LEN, borderTopRightRadius: 3 },
  cblH: { bottom: 0, left: 0, width: CORNER_LEN, height: CORNER_W, borderBottomLeftRadius: 3 },
  cblV: { bottom: 0, left: 0, width: CORNER_W, height: CORNER_LEN, borderBottomLeftRadius: 3 },
  cbrH: { bottom: 0, right: 0, width: CORNER_LEN, height: CORNER_W, borderBottomRightRadius: 3 },
  cbrV: { bottom: 0, right: 0, width: CORNER_W, height: CORNER_LEN, borderBottomRightRadius: 3 },

  scanBeam: {
    position:        "absolute",
    left:            0,
    right:           0,
    height:          2,
    borderRadius:    1,
    backgroundColor: GLOW,
    ...shadow(14, GLOW, 0.9, 0, 0, 6),
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
    backgroundColor: GLOW,
    alignItems:      "center",
    justifyContent:  "center",
    ...shadow(20, GLOW, 0.6, 0, 0, 10),
  },
});
