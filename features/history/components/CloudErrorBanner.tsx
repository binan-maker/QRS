import React, { memo } from "react";
import { Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  onRetry: () => void;
}

const CloudErrorBanner = memo(function CloudErrorBanner({ onRetry }: Props) {
  const { colors } = useTheme();

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
      <Text style={[styles.text, { color: colors.warning }]}>
        Couldn't load cloud history — tap to retry
      </Text>
    </Pressable>
  );
});

export default CloudErrorBanner;

const styles = StyleSheet.create({
  banner: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              8,
    padding:          10,
    borderRadius:     12,
    borderWidth:      1,
    marginHorizontal: 16,
    marginBottom:     6,
  },
  text: {
    fontFamily: "Inter_500Medium",
    fontSize:   12,
    flex:       1,
  },
});
