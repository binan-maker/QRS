import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export default function HistoryItemSkeleton() {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  const bone = (style: object) => (
    <Animated.View style={[{ backgroundColor: colors.surfaceBorder, borderRadius: 8, opacity }, style]} />
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      {bone({ width: 54, height: 54, borderRadius: 18, flexShrink: 0 })}
      <View style={styles.body}>
        {bone({ height: 14, width: "72%", marginBottom: 8 })}
        <View style={styles.metaRow}>
          {bone({ height: 22, width: 56, borderRadius: 100 })}
          {bone({ height: 22, width: 40, borderRadius: 100 })}
        </View>
      </View>
      <View style={styles.right}>
        {bone({ height: 10, width: 50 })}
        {bone({ width: 28, height: 28, borderRadius: 10 })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    marginBottom: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
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
