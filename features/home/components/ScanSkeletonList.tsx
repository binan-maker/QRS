import React from "react";
import { View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { cardStyles } from "@/features/home/components/scanCardStyles";

export function ScanSkeletonList() {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          entering={FadeInRight.duration(260).delay(Math.min(i, 4) * 22)}
          style={[
            cardStyles.scanItem,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: 0.7 },
          ]}
        >
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surfaceBorder }} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ height: 14, width: "65%", borderRadius: 7, backgroundColor: colors.surfaceBorder }} />
            <View style={{ height: 11, width: "40%", borderRadius: 5.5, backgroundColor: colors.surfaceBorder }} />
          </View>
          <View style={{ gap: 8, alignItems: "flex-end" }}>
            <View style={{ height: 11, width: 36, borderRadius: 5.5, backgroundColor: colors.surfaceBorder }} />
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: colors.surfaceBorder }} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
