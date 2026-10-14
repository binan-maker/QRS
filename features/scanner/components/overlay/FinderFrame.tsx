import React, { memo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { FINDER_SIZE } from "./constants";

const CORNER_LEN = 28;
const CORNER_W = 3;
const CORNER_RADIUS = 12;
const CORNER_COLOR = "rgba(255,255,255,0.88)";

interface Props {
  cornerBreath: Animated.Value;
}

export default memo(function FinderFrame({ cornerBreath }: Props) {
  return (
    <Animated.View style={[styles.frame, { opacity: cornerBreath }]}>
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  frame: {
    width: FINDER_SIZE,
    height: FINDER_SIZE,
  },
  corner: {
    position: "absolute",
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: CORNER_COLOR,
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_W,
    borderLeftWidth: CORNER_W,
    borderTopLeftRadius: CORNER_RADIUS,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_W,
    borderRightWidth: CORNER_W,
    borderTopRightRadius: CORNER_RADIUS,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_W,
    borderLeftWidth: CORNER_W,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_W,
    borderRightWidth: CORNER_W,
    borderBottomRightRadius: CORNER_RADIUS,
  },
});
