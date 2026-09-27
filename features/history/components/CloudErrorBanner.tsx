import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  onRetry:  () => void;
  colors:   any;
  fontSize: (n: number) => number;
}

const CloudErrorBanner = memo(function CloudErrorBanner({ onRetry, colors, fontSize }: Props) {
  return (
    <Pressable
      onPress={onRetry}
      style={[
        styles.banner,
        {
          backgroundColor: colors.warningDim,
          borderColor:     colors.warning + "40",
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={15} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning, fontSize: fontSize(12) }]}>
        Couldn't load cloud history — tap to retry
      </Text>
    </Pressable>
  );
});

export default CloudErrorBanner;

const styles = StyleSheet.create({
  banner: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             8,
    padding:         10,
    borderRadius:    12,
    borderWidth:     1,
    marginHorizontal: 16,
    marginBottom:    6,
  },
  text: {
    fontFamily: "Inter_500Medium",
    flex:       1,
  },
});
