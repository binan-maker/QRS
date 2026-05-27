import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  noBorder?: boolean;
}

export default function ScreenHeader({ title, onBack, right, noBorder }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.navBar,
        !noBorder && { borderBottomColor: colors.surfaceBorder, borderBottomWidth: 1 },
      ]}
    >
      <Pressable
        onPress={onBack ?? (() => router.back())}
        style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {right != null ? (
        <View style={styles.rightSlot}>{right}</View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 16,
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  spacer: { width: 38, flexShrink: 0 },
  rightSlot: { width: 38, alignItems: "flex-end", flexShrink: 0 },
});
