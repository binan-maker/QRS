import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import ReAnimated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  index?: number;
}

export default function HistoryItemSkeleton({ index = 0 }: Props) {
  const { isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  const cardBg     = isDark ? "rgba(255,255,255,0.08)" : "#ffffff";
  const cardBorder = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.08)";
  const boneColor  = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)";

  const bone = (style: object) => (
    <Animated.View style={[{ backgroundColor: boneColor, borderRadius: 8, opacity }, style]} />
  );

  return (
    <ReAnimated.View entering={FadeInDown.delay(Math.min(index, 4) * 22).duration(260)}>
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
    </ReAnimated.View>
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
