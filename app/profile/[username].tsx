import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";

export default function PublicProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  return (
    <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Pressable
        onPress={handleBack}
        style={[styles.backBtn, { top: insets.top + 8, backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
      <Text style={[styles.title, { color: colors.text }]}>Profile is Private</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        BinRo user profiles and scan activity are completely private.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
