import React from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FINDER_SIZE } from "@/features/scanner/hooks/useCameraControls";
import { SCANNER_GLOW } from "./constants";

// Corner geometry
const CORNER_LEN    = 28;
const CORNER_W      = 3;
const CORNER_RADIUS = 12;   // visibly rounded tips

const CORNER_DEFAULT = "rgba(255,255,255,0.88)";
const CORNER_SUCCESS = SCANNER_GLOW;

interface Props {
  scanned:      boolean;
  scanSuccess:  boolean;
  cornerBreath: Animated.Value;
}

export default function FinderFrame({ scanned, scanSuccess, cornerBreath }: Props) {
  const cornerColor = scanSuccess ? CORNER_SUCCESS : CORNER_DEFAULT;

  return (
    <View style={styles.frame}>

      {/* ── Top-left corner ── */}
      <Animated.View style={[styles.corner, styles.ctlH, { backgroundColor: cornerColor, opacity: cornerBreath }]} />
      <Animated.View style={[styles.corner, styles.ctlV, { backgroundColor: cornerColor, opacity: cornerBreath }]} />

      {/* ── Top-right corner ── */}
      <Animated.View style={[styles.corner, styles.ctrH, { backgroundColor: cornerColor, opacity: cornerBreath }]} />
      <Animated.View style={[styles.corner, styles.ctrV, { backgroundColor: cornerColor, opacity: cornerBreath }]} />

      {/* ── Bottom-left corner ── */}
      <Animated.View style={[styles.corner, styles.cblH, { backgroundColor: cornerColor, opacity: cornerBreath }]} />
      <Animated.View style={[styles.corner, styles.cblV, { backgroundColor: cornerColor, opacity: cornerBreath }]} />

      {/* ── Bottom-right corner ── */}
      <Animated.View style={[styles.corner, styles.cbrH, { backgroundColor: cornerColor, opacity: cornerBreath }]} />
      <Animated.View style={[styles.corner, styles.cbrV, { backgroundColor: cornerColor, opacity: cornerBreath }]} />

      {/* Success overlay */}
      {scanSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successOuterRing}>
            <View style={styles.successRing}>
              <Ionicons name="checkmark" size={42} color="#fff" />
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
    overflow: "visible",
  },
  corner: {
    position: "absolute",
  },

  // ── Top-left ──
  ctlH: {
    top:              0,
    left:             0,
    width:            CORNER_LEN,
    height:           CORNER_W,
    borderTopLeftRadius:     CORNER_RADIUS,
    borderTopRightRadius:    CORNER_RADIUS / 3,
    borderBottomRightRadius: CORNER_RADIUS / 3,
  },
  ctlV: {
    top:              0,
    left:             0,
    width:            CORNER_W,
    height:           CORNER_LEN,
    borderTopLeftRadius:    CORNER_RADIUS,
    borderBottomLeftRadius: CORNER_RADIUS / 3,
    borderBottomRightRadius: CORNER_RADIUS / 3,
  },

  // ── Top-right ──
  ctrH: {
    top:   0,
    right: 0,
    width:  CORNER_LEN,
    height: CORNER_W,
    borderTopRightRadius:    CORNER_RADIUS,
    borderTopLeftRadius:     CORNER_RADIUS / 3,
    borderBottomLeftRadius:  CORNER_RADIUS / 3,
  },
  ctrV: {
    top:   0,
    right: 0,
    width:  CORNER_W,
    height: CORNER_LEN,
    borderTopRightRadius:    CORNER_RADIUS,
    borderBottomRightRadius: CORNER_RADIUS / 3,
    borderBottomLeftRadius:  CORNER_RADIUS / 3,
  },

  // ── Bottom-left ──
  cblH: {
    bottom: 0,
    left:   0,
    width:  CORNER_LEN,
    height: CORNER_W,
    borderBottomLeftRadius:  CORNER_RADIUS,
    borderBottomRightRadius: CORNER_RADIUS / 3,
    borderTopRightRadius:    CORNER_RADIUS / 3,
  },
  cblV: {
    bottom: 0,
    left:   0,
    width:  CORNER_W,
    height: CORNER_LEN,
    borderBottomLeftRadius: CORNER_RADIUS,
    borderTopLeftRadius:    CORNER_RADIUS / 3,
    borderTopRightRadius:   CORNER_RADIUS / 3,
  },

  // ── Bottom-right ──
  cbrH: {
    bottom: 0,
    right:  0,
    width:  CORNER_LEN,
    height: CORNER_W,
    borderBottomRightRadius: CORNER_RADIUS,
    borderBottomLeftRadius:  CORNER_RADIUS / 3,
    borderTopLeftRadius:     CORNER_RADIUS / 3,
  },
  cbrV: {
    bottom: 0,
    right:  0,
    width:  CORNER_W,
    height: CORNER_LEN,
    borderBottomRightRadius: CORNER_RADIUS,
    borderTopRightRadius:    CORNER_RADIUS / 3,
    borderTopLeftRadius:     CORNER_RADIUS / 3,
  },

  // ── Success ──
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(59,130,246,0.06)",
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    14,
  },
  successOuterRing: {
    width:           100,
    height:          100,
    borderRadius:    50,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth:     1,
    borderColor:     `${SCANNER_GLOW}55`,
    alignItems:      "center",
    justifyContent:  "center",
  },
  successRing: {
    width:           78,
    height:          78,
    borderRadius:    39,
    backgroundColor: SCANNER_GLOW,
    alignItems:      "center",
    justifyContent:  "center",
  },
});
