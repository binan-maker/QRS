import React, { memo } from "react";
import { View, Text, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import * as Haptics from "@/shared/utils/haptics";
import type { QrTemplate } from "@/features/generator/types/template-types";

interface Props {
  templates: QrTemplate[];
  onPickTemplate: (t: QrTemplate) => void;
}

function HomeView({ templates, onPickTemplate }: Props) {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const s  = Math.min(Math.max(screenW / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: sp(16), paddingBottom: sp(24), gap: sp(8) }}
    >
      {templates.map((t, idx) => (
        <Animated.View key={t.id} entering={FadeInDown.duration(220).delay(idx * 40)}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPickTemplate(t); }}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: sp(14),
              borderRadius: sp(16), borderWidth: 1,
              borderColor: pressed ? t.color + "55" : colors.surfaceBorder,
              backgroundColor: pressed ? t.color + "0D" : colors.surface,
              padding: sp(14),
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <View style={{
              width: sp(44), height: sp(44), borderRadius: sp(12),
              backgroundColor: t.color + "18",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Ionicons name={t.icon as any} size={rf(21)} color={t.color} />
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: sp(2) }}>
              <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.text }}>
                {t.name}
              </Text>
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                {t.tagline}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={rf(15)} color={colors.textMuted} style={{ flexShrink: 0 }} />
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

export default memo(HomeView);
