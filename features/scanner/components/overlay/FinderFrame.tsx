import React from "react";
import { View, StyleSheet, Animated } from "react-native";
import { FINDER_SIZE } from "@/features/scanner/hooks/useCameraControls";

// Corner geometry
const CORNER_LEN    = 28;
const CORNER_W      = 3;
const CORNER_RADIUS = 12;   // visibly rounded tips

const CORNER_DEFAULT = "rgba(255,255,255,0.88)";

interface Props {
  cornerBreath: Animated.Value;
}

export default function FinderFrame({ cornerBreath }: Props) {
  return (
    <View style={styles.frame}>

      {/* ── Top-left corner ── */}
      <Animated.View style={[styles.corner, styles.ctlH, { backgroundColor: CORNER_DEFAULT, opacity: cornerBreath }]} />
      <Animated.View style={[styles.corner, styles.ctlV, { backgroundColor: CORNER_DEFAULT, opacity: cornerBreath }]} />

      {/* ── Top-right corner ── */}
      <Animated.View style={[styles.corner, styles.ctrH, { backgroundColor: CORNER_DEFAULT, opacity: cornerBreath }]} />
      <Animated.View style={[styles.corner, styles.ctrV, { backgroundColor: CORNER_DEFAULT, opacity: cornerBreath }]} />

      {/* ── Bottom-left corner ── */}
      <Animated.View style={[styles.corner, styles.cblH, { backgroundColor: CORNER_DEFAULT, opacity: cornerBreath }]} />
      <Animated.View style={[styles.corner, styles.cblV, { backgroundColor: CORNER_DEFAULT, opacity: cornerBreath }]} />

      {/* ── Bottom-right corner ── */}
      <Animated.View style={[styles.corner, styles.cbrH, { backgroundColor: CORNER_DEFAULT, opacity: cornerBreath }]} />
      <Animated.View style={[styles.corner, styles.cbrV, { backgroundColor: CORNER_DEFAULT, opacity: cornerBreath }]} />
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

});
