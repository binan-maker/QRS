import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  colors: any;
}

const OfflineBanner = React.memo(function OfflineBanner({ colors }: Props) {
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name="wifi-outline" size={12} color={colors.textMuted} />
      </View>
      <Text
        style={[styles.text, { color: colors.textSecondary }]}
        maxFontSizeMultiplier={1}
      >
        You're Offline · Showing cached data
      </Text>
    </View>
  );
});

export default OfflineBanner;

const styles = StyleSheet.create({
  banner: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              8,
    marginHorizontal: 16,
    marginBottom:     8,
    paddingHorizontal: 12,
    paddingVertical:  8,
    borderRadius:     12,
    borderWidth:      1,
  },
  dot: {
    width:        22,
    height:       22,
    borderRadius: 7,
    alignItems:   "center",
    justifyContent: "center",
    flexShrink:   0,
  },
  text: {
    fontFamily: "Inter_500Medium",
    fontSize:   12,
    flex:       1,
  },
});
