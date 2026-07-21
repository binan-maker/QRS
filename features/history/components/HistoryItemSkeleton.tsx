import React, { useEffect, useRef, memo } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  index?: number;
}

// memo prevents re-renders when parent re-renders with unchanged props.
// Skeletons are purely visual placeholders so there is never a reason to
// re-render them once mounted.
const HistoryItemSkeleton = memo(function HistoryItemSkeleton({ index = 0 }: Props) {
  const { isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stagger shimmer phase per card so they pulse at slightly different times —
    // this creates a natural "breathing" look without staggering the mount itself.
    const delay = Math.min(index, 4) * 120;
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  // shimmer ref is stable; index drives the stagger only on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  const cardBg     = isDark ? "rgba(255,255,255,0.08)" : "#ffffff";
  const cardBorder = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.08)";
  const boneColor  = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)";

  const bone = (style: object) => (
    <Animated.View style={[{ backgroundColor: boneColor, borderRadius: 8, opacity }, style]} />
  );

  // No entering animation — skeletons are the initial layout state and must
  // appear instantly. Staggering their entrance creates the card-by-card effect
  // we're trying to eliminate.
  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.body}>
        {bone({ height: 14, width: "68%", marginBottom: 5, borderRadius: 7 })}
        {bone({ height: 11, width: "45%", marginBottom: 7, borderRadius: 6 })}
        <View style={styles.metaRow}>
          {bone({ height: 20, width: 52, borderRadius: 100 })}
        </View>
      </View>
      <View style={styles.right}>
        {bone({ height: 10, width: 42, borderRadius: 6 })}
        {bone({ width: 28, height: 28, borderRadius: 9 })}
      </View>
    </View>
  );
});

export default HistoryItemSkeleton;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 13,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
  },
  right: {
    alignItems: "flex-end",
    gap: 8,
    flexShrink: 0,
  },
});
