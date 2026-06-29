import React, { useState, useMemo, memo } from "react";
import { View, Text, Pressable, ScrollView, TextInput, useWindowDimensions } from "react-native";
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
  const { colors, isDark } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const s  = Math.min(Math.max(screenW / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      t.name.toLowerCase().includes(q) || t.tagline.toLowerCase().includes(q)
    );
  }, [templates, search]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: sp(16), paddingBottom: sp(24), gap: sp(10) }}
    >
      {/* Search bar */}
      <Animated.View entering={FadeInDown.duration(200)}>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: sp(10),
          backgroundColor: isDark ? colors.surface : colors.surfaceLight,
          borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder,
          paddingHorizontal: sp(14), paddingVertical: sp(10),
        }}>
          <Ionicons name="search-outline" size={rf(16)} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search templates…"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.text }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={rf(16)} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Divider */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginVertical: sp(2) }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
        <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted }}>
          {filtered.length} TEMPLATE{filtered.length !== 1 ? "S" : ""}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
      </View>

      {/* Template list — full-width rows */}
      {filtered.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: sp(32), gap: sp(8) }}>
          <Ionicons name="search-outline" size={rf(32)} color={colors.textMuted} />
          <Text style={{ fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.textMuted }}>No templates found</Text>
          <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted }}>Try a different search term</Text>
        </View>
      ) : (
        <View style={{ gap: sp(8) }}>
          {filtered.map((t, idx) => (
            <Animated.View key={t.id} entering={FadeInDown.duration(220).delay(idx * 40)}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPickTemplate(t); }}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: sp(14),
                  borderRadius: sp(18), borderWidth: 1,
                  borderColor: pressed ? t.color + "55" : colors.surfaceBorder,
                  backgroundColor: pressed ? t.color + "0D" : colors.surface,
                  padding: sp(14),
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                })}
              >
                {/* Icon bubble */}
                <View style={{
                  width: sp(46), height: sp(46), borderRadius: sp(13),
                  backgroundColor: t.color + "18",
                  alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Ionicons name={t.icon as any} size={rf(22)} color={t.color} />
                </View>

                {/* Text */}
                <View style={{ flex: 1, minWidth: 0, gap: sp(2) }}>
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.text }}>
                    {t.name}
                  </Text>
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                    {t.tagline}
                  </Text>
                </View>

                {/* Chevron */}
                <Ionicons name="chevron-forward" size={rf(16)} color={colors.textMuted} style={{ flexShrink: 0 }} />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default memo(HomeView);
