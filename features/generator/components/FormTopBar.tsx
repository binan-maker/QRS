import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { FORM_MODE_META } from "@/features/generator/types/form-types";
import type { QrMode } from "@/features/generator/types/form-types";

interface Props {
  mode:        QrMode;
  onOpenInfo:  () => void;
}

export default function FormTopBar({ mode, onOpenInfo }: Props) {
  const { colors } = useTheme();
  const meta = FORM_MODE_META[mode as "individual" | "private"] ?? FORM_MODE_META.individual;

  return (
    <Animated.View
      entering={FadeInDown.delay(0).duration(260)}
      style={[styles.topBar, { borderBottomColor: colors.surfaceBorder }]}
    >
      <Animated.View entering={FadeIn.delay(30).duration(240)}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: colors.surface,
              borderColor:     colors.surfaceBorder,
              opacity:         pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(40).duration(280)} style={styles.center}>
        <View style={[styles.modeDot, { backgroundColor: meta.color }]} />
        <Text style={[styles.title, { color: meta.color }]}>{meta.label} QR</Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(30).duration(240)}>
        <Pressable
          onPress={onOpenInfo}
          style={[styles.infoBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              10,
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  center: {
    flex: 1, flexDirection: "row", alignItems: "center",
    gap: 8, justifyContent: "center",
  },
  modeDot: { width: 8, height: 8, borderRadius: 4 },
  title:   { fontSize: 15, fontFamily: "Inter_700Bold" },
  infoBtn: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
});
