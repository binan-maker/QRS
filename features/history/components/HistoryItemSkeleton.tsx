import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export default function HistoryItemSkeleton() {
  const { colors, isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });
  const cardBg = isDark ? colors.surface : "#ffffff";

  const bone = (style: object) => (
    <Animated.View style={[{ backgroundColor: colors.surfaceBorder, borderRadius: 8, opacity }, style]} />
  );

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.surfaceBorder }]}>
      {bone({ width: 48, height: 48, borderRadius: 15, flexShrink: 0 })}
      <View style={styles.body}>
        {bone({ height: 14, width: "68%", marginBottom: 5, borderRadius: 7 })}
        {bone({ height: 11, width: "45%", marginBottom: 7, borderRadius: 6 })}
        <View style={styles.metaRow}>
          {bone({ height: 20, width: 52, borderRadius: 100 })}
          {bone({ height: 20, width: 38, borderRadius: 100 })}
        </View>
      </View>
      <View style={styles.right}>
        {bone({ height: 10, width: 42, borderRadius: 6 })}
        {bone({ width: 28, height: 28, borderRadius: 9 })}
      </View>
    </View>
  );
}

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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
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
