import React, { memo } from "react";
import { StyleSheet, Animated } from "react-native";

interface Props {
  x: number;
  y: number;
  anim: Animated.Value;
}

export const TapFocusRing = memo(function TapFocusRing({ x, y, anim }: Props) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.focusRing,
        {
          left: x - 28,
          top: y - 28,
          opacity: anim,
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [1.4, 1],
              }),
            },
          ],
        },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  focusRing: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.80)",
    zIndex: 5,
  },
});
