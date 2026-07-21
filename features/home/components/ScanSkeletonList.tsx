import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import ReAnimated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";

function SkeletonCard({ index }: { index: number }) {
  const { isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
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
        {bone({ width: 46, height: 46, borderRadius: 14, flexShrink: 0 })}
        <View style={{ flex: 1, gap: 8 }}>
          {bone({ height: 14, width: "65%", borderRadius: 7 })}
          {bone({ height: 11, width: "40%", borderRadius: 6 })}
        </View>
        <View style={{ gap: 8, alignItems: "flex-end" }}>
          {bone({ height: 11, width: 36, borderRadius: 6 })}
          {bone({ width: 28, height: 28, borderRadius: 9 })}
        </View>
      </View>
    </ReAnimated.View>
  );
}

export function ScanSkeletonList() {
  return (
    <View style={{ gap: 10 }}>
      {[0, 1, 2].map((i) => <SkeletonCard key={i} index={i} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 13,
  },
});
