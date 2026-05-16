import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const OFFLINE_COLOR = "#3b82f6";

interface Props {
  colors: any;
}

const OfflineBanner = React.memo(function OfflineBanner({ colors }: Props) {
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.surface, borderColor: OFFLINE_COLOR + "30" },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: OFFLINE_COLOR + "20" }]}>
        <Ionicons name="wifi-outline" size={12} color={OFFLINE_COLOR} />
      </View>
      <Text
        style={[styles.text, { color: OFFLINE_COLOR }]}
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
    flexDirection:   "row",
    alignItems:      "center",
    gap:             8,
    marginHorizontal: 16,
    marginBottom:    8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius:    12,
    borderWidth:     1,
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
